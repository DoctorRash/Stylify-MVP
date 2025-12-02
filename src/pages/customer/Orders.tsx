
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MessageSquare, Star } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { OrderMessaging } from "@/components/OrderMessaging";
import { NotificationBell } from "@/components/NotificationBell";
import { ReviewDialog } from "@/components/ReviewDialog";

type Order = Tables<"orders">;
type Review = Tables<"reviews">;

const Orders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<{ orderId: string; tailorId: string } | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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

      if (userData?.role !== 'customer') {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This page is only for customers."
        });
        navigate('/');
        return;
      }

      loadOrders();
    };

    checkAuthAndLoad();
  }, [navigate, toast]);

  const handleReviewClick = async (order: Order) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if review already exists
      const { data: review } = await supabase
        .from('reviews')
        .select('*')
        .eq('order_id', order.id)
        .eq('customer_user_id', session.user.id)
        .maybeSingle();

      setExistingReview(review);
      setSelectedOrder({ orderId: order.id, tailorId: order.tailor_id });
      setReviewDialogOpen(true);
    } catch (error) {
      console.error('Error checking review:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_user_id', session.user.id)
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
            <h1 className="text-4xl font-bold text-primary mb-2">My Orders</h1>
            <p className="text-muted-foreground">Track your custom orders</p>
          </div>
          <div className="flex gap-2">
            <NotificationBell />
            <Button onClick={() => navigate('/customer/explore')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Explore
            </Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No orders yet</p>
              <Button onClick={() => navigate('/customer/explore')}>
                Explore Tailors
              </Button>
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
                    {order.fabric_type && (
                      <div>
                        <p className="text-muted-foreground">Fabric Type</p>
                        <p className="font-medium">{order.fabric_type}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedOrderId(order.id)}
                      variant="outline"
                      className="flex-1"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Messages
                    </Button>
                    {order.status === 'completed' && (
                      <Button
                        onClick={() => handleReviewClick(order)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedOrder && (
          <ReviewDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            orderId={selectedOrder.orderId}
            tailorId={selectedOrder.tailorId}
            existingReview={existingReview || undefined}
          />
        )}
      </motion.div>
    </div>
  );
};

export default Orders;
