-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create storage bucket for order reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-references', 'order-references', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order reference images
DROP POLICY IF EXISTS "Anyone can upload order reference images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view order reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their order reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their order reference images" ON storage.objects;

CREATE POLICY "Anyone can upload order reference images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-references');

CREATE POLICY "Anyone can view order reference images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'order-references');

CREATE POLICY "Users can update their order reference images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'order-references');

CREATE POLICY "Users can delete their order reference images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'order-references');

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_related_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger to notify on new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_record RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Get order details
  SELECT o.*, t.user_id as tailor_user_id 
  INTO v_order_record
  FROM public.orders o
  LEFT JOIN public.tailors t ON o.tailor_id = t.id
  WHERE o.id = NEW.order_id;
  
  -- Get sender name
  SELECT name INTO v_sender_name
  FROM public.users
  WHERE id = NEW.sender_id;
  
  -- Determine recipient (opposite of sender)
  IF NEW.sender_id = v_order_record.customer_user_id THEN
    v_recipient_id := v_order_record.tailor_user_id;
  ELSE
    v_recipient_id := v_order_record.customer_user_id;
  END IF;
  
  -- Create notification if recipient exists
  IF v_recipient_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_recipient_id,
      'new_message',
      'New Message',
      v_sender_name || ' sent you a message',
      NEW.order_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- Trigger to notify on order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_user_id UUID;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get customer user ID
    SELECT customer_user_id INTO v_customer_user_id
    FROM public.orders
    WHERE id = NEW.id;
    
    -- Create notification if customer exists
    IF v_customer_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_customer_user_id,
        'order_status',
        'Order Status Updated',
        'Your order status changed to: ' || NEW.status,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();