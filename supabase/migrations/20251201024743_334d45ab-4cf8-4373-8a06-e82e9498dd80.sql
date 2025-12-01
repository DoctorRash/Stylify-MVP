-- Create messages table for customer-tailor communication
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_messages_order_id ON public.messages(order_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view messages from their orders"
ON public.messages
FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE customer_user_id = auth.uid() 
    OR tailor_id IN (
      SELECT id FROM public.tailors WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can send messages to their orders"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  order_id IN (
    SELECT id FROM public.orders 
    WHERE customer_user_id = auth.uid() 
    OR tailor_id IN (
      SELECT id FROM public.tailors WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (sender_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Add notes field to orders for status updates
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE;

-- Create order status history table for tracking
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status history of their orders"
ON public.order_status_history
FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE customer_user_id = auth.uid() 
    OR tailor_id IN (
      SELECT id FROM public.tailors WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Tailors can add status updates to their orders"
ON public.order_status_history
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  order_id IN (
    SELECT id FROM public.orders 
    WHERE tailor_id IN (
      SELECT id FROM public.tailors WHERE user_id = auth.uid()
    )
  )
);