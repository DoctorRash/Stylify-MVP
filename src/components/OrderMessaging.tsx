
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages">;
type Order = Tables<"orders">;

interface OrderMessagingProps {
  orderId: string;
  onClose: () => void;
}

export const OrderMessaging = ({ orderId, onClose }: OrderMessagingProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        
        // Get current user's name
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', session.user.id)
          .single();
        
        if (userData) {
          setCurrentUserName(userData.name);
        }
      }
      
      // Load order details for notifications
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (orderData) {
        setOrder(orderData);
      }
      
      await loadMessages();
    };

    init();

    // Set up realtime subscription
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        variant: "destructive",
        title: "Failed to load messages",
        description: "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUserId || !order) return;

    setSending(true);
    try {
      const messageContent = newMessage.trim();
      
      const { error } = await supabase
        .from('messages')
        .insert({
          order_id: orderId,
          sender_id: currentUserId,
          content: messageContent
        });

      if (error) throw error;

      // Send email notification to the other party
      try {
        // Determine if current user is tailor or customer
        const { data: tailorData } = await supabase
          .from('tailors')
          .select('user_id, business_name')
          .eq('id', order.tailor_id)
          .single();

        const isTailor = tailorData?.user_id === currentUserId;
        
        if (isTailor) {
          // Tailor is sending, notify customer
          await supabase.functions.invoke("send-notification", {
            body: {
              type: "new_message",
              recipient_email: order.customer_email,
              recipient_phone: order.customer_phone,
              order_id: orderId,
              message: messageContent,
              sender_name: tailorData?.business_name || currentUserName,
              recipient_name: order.customer_name,
            },
          });
        } else {
          // Customer is sending, notify tailor
          // Get tailor's email
          if (tailorData?.user_id) {
            const { data: tailorUserData } = await supabase
              .from('users')
              .select('email')
              .eq('id', tailorData.user_id)
              .single();
            
            if (tailorUserData?.email) {
              await supabase.functions.invoke("send-notification", {
                body: {
                  type: "new_message",
                  recipient_email: tailorUserData.email,
                  order_id: orderId,
                  message: messageContent,
                  sender_name: order.customer_name,
                  recipient_name: tailorData?.business_name,
                },
              });
            }
          }
        }
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
        // Don't fail the message send if notification fails
      }

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again."
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)]">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order Messages</CardTitle>
                {order && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Order #{orderId.slice(0, 8)} • {order.customer_name}
                  </p>
                )}
              </div>
              <Button onClick={onClose} variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[calc(100%-5rem)]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === currentUserId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
