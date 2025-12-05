
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { OrderMessaging } from "@/components/OrderMessaging";

type Order = Tables<"orders">;

const TailorOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailorId, setTailorId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userData?.role !== 'tailor') {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This page is only for tailors."
        });
        navigate('/');
        return;
      }

      const { data: tailorData } = await supabase
        .from('tailors')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (tailorData) {
        setTailorId(tailorData.id);
        loadOrders(tailorData.id);
      } else {
        setLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [navigate, toast]);

  const loadOrders = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tailor_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        variant: "destructive",
        title: "Failed to load orders",
        description: "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string, notes?: string) => {
    setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get order details for notification
      const order = orders.find(o => o.id === orderId);

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          notes: notes || null
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Add to status history
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: newStatus,
          notes: notes || null,
          created_by: session.user.id
        });

      if (historyError) throw historyError;

      // Send notification to customer
      if (order) {
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              type: "order_status",
              recipient_email: order.customer_email,
              recipient_phone: order.customer_phone,
              order_id: orderId,
              customer_name: order.customer_name,
              status: newStatus,
              message: notes,
            },
          });
        } catch (notifyError) {
          console.error("Notification error:", notifyError);
        }
      }

      toast({
        title: "Status updated",
        description: "Order status has been updated successfully."
      });

      if (tailorId) loadOrders(tailorId);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: "Please try again."
      });
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500"
    };
    return colors[status] || "bg-gray-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedOrderId) {
    return (
      <OrderMessaging
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Orders</h1>
            <p className="text-muted-foreground">Manage your customer orders</p>
          </div>
          <Button onClick={() => navigate('/tailor/dashboard')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">Order #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Placed on {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Customer Name</p>
                      <p className="font-medium">{order.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{order.customer_phone}</p>
                    </div>
                    {order.customer_email && (
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{order.customer_email}</p>
                      </div>
                    )}
                    {order.fabric_type && (
                      <div>
                        <p className="text-muted-foreground">Fabric Type</p>
                        <p className="font-medium">{order.fabric_type}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Update Status</Label>
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusUpdate(order.id, value)}
                      disabled={updatingStatus[order.id]}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {order.notes && (
                    <div>
                      <Label>Notes</Label>
                      <p className="text-sm mt-1 p-2 bg-muted rounded">{order.notes}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => setSelectedOrderId(order.id)}
                    variant="outline"
                    className="w-full"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    View Messages
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TailorOrders;
