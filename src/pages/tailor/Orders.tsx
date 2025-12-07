import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MessageSquare, Eye, User } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { OrderMessaging } from "@/components/OrderMessaging";

type Order = Tables<"orders">;
type Style = Tables<"styles">;

interface OrderWithStyle extends Order {
  style?: Style | null;
}

const TailorOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailorId, setTailorId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
  const [viewingOrder, setViewingOrder] = useState<OrderWithStyle | null>(null);

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

  // Real-time subscription
  useEffect(() => {
    if (!tailorId) return;

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tailor_id=eq.${tailorId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadOrders(tailorId);
            toast({
              title: "New Order Received!",
              description: "A new order has been placed.",
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => 
              o.id === (payload.new as Order).id ? { ...o, ...payload.new as Order } : o
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tailorId, toast]);

  const loadOrders = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tailor_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch style info for orders that have style_id
      const ordersWithStyles: OrderWithStyle[] = await Promise.all(
        (data || []).map(async (order) => {
          if (order.style_id) {
            const { data: styleData } = await supabase
              .from('styles')
              .select('*')
              .eq('id', order.style_id)
              .single();
            return { ...order, style: styleData };
          }
          return { ...order, style: null };
        })
      );

      setOrders(ordersWithStyles);
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

      // Send email notification to customer
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
        description: "Order status has been updated and customer notified."
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

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      in_progress: "outline",
      completed: "default",
      cancelled: "destructive"
    };
    return variants[status] || "secondary";
  };

  const parseMeasurements = (measurements: any) => {
    if (!measurements) return null;
    if (typeof measurements === 'string') {
      try {
        return JSON.parse(measurements);
      } catch {
        return null;
      }
    }
    return measurements;
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">Manage Orders</h1>
            <p className="text-muted-foreground">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>
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
            {orders.map((order) => {
              const measurements = parseMeasurements(order.measurements);
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        {/* Customer Avatar */}
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{order.customer_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Order #{order.id.slice(0, 8)} • {new Date(order.created_at!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm">
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Phone</p>
                        <p className="font-medium">{order.customer_phone}</p>
                      </div>
                      {order.customer_email && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Email</p>
                          <p className="font-medium">{order.customer_email}</p>
                        </div>
                      )}
                      {order.fabric_type && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Fabric Type</p>
                          <p className="font-medium">{order.fabric_type}</p>
                        </div>
                      )}
                      {order.delivery_date && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Expected Delivery</p>
                          <p className="font-medium">{new Date(order.delivery_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Style Image */}
                    {(order.style?.image_url || order.design_image_url) && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Selected Style</p>
                        <img 
                          src={order.style?.image_url || order.design_image_url || ''} 
                          alt="Style" 
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Measurements Preview */}
                    {measurements && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Measurements</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(measurements).slice(0, 4).map(([key, value]) => (
                            <div key={key} className="bg-muted/50 p-2 rounded text-sm">
                              <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}: </span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))}
                          {Object.keys(measurements).length > 4 && (
                            <div className="bg-muted/50 p-2 rounded text-sm text-muted-foreground">
                              +{Object.keys(measurements).length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto py-2">
                      {['pending', 'in_progress', 'completed'].map((status, index) => (
                        <div key={status} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                            order.status === status 
                              ? getStatusColor(status) + ' text-white' 
                              : ['pending', 'in_progress', 'completed'].indexOf(order.status) > index
                                ? 'bg-green-500 text-white'
                                : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <span className={`ml-2 text-sm whitespace-nowrap ${
                            order.status === status ? 'font-medium' : 'text-muted-foreground'
                          }`}>
                            {status.replace('_', ' ')}
                          </span>
                          {index < 2 && (
                            <div className={`w-8 h-0.5 mx-2 ${
                              ['pending', 'in_progress', 'completed'].indexOf(order.status) > index
                                ? 'bg-green-500'
                                : 'bg-muted'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
                      <div className="flex-1">
                        <Label className="text-sm mb-2 block">Update Status</Label>
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

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setViewingOrder(order)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Order Details - #{order.id.slice(0, 8)}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-muted-foreground">Customer Name</Label>
                                <p className="font-medium">{order.customer_name}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Phone</Label>
                                <p className="font-medium">{order.customer_phone}</p>
                              </div>
                              {order.customer_email && (
                                <div>
                                  <Label className="text-muted-foreground">Email</Label>
                                  <p className="font-medium">{order.customer_email}</p>
                                </div>
                              )}
                              {order.fabric_type && (
                                <div>
                                  <Label className="text-muted-foreground">Fabric Type</Label>
                                  <p className="font-medium">{order.fabric_type}</p>
                                </div>
                              )}
                            </div>

                            {(order.style?.image_url || order.design_image_url) && (
                              <div>
                                <Label className="text-muted-foreground">Style Image</Label>
                                <img 
                                  src={order.style?.image_url || order.design_image_url || ''} 
                                  alt="Style" 
                                  className="w-full max-w-xs h-48 object-cover rounded-lg mt-2"
                                />
                              </div>
                            )}

                            {order.photo_urls && order.photo_urls.length > 0 && (
                              <div>
                                <Label className="text-muted-foreground">Customer Photos</Label>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {order.photo_urls.map((url, i) => (
                                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-24 h-24 object-cover rounded" />
                                  ))}
                                </div>
                              </div>
                            )}

                            {measurements && (
                              <div>
                                <Label className="text-muted-foreground">Full Measurements</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {Object.entries(measurements).map(([key, value]) => (
                                    <div key={key} className="bg-muted p-2 rounded">
                                      <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}: </span>
                                      <span className="font-medium">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {order.notes && (
                              <div>
                                <Label className="text-muted-foreground">Notes</Label>
                                <p className="mt-1 p-3 bg-muted rounded">{order.notes}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        onClick={() => setSelectedOrderId(order.id)}
                        variant="outline"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Messages
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TailorOrders;
