import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  CheckCircle, 
  Package, 
  Clock, 
  CheckCheck, 
  XCircle, 
  Star, 
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type Style = Tables<"styles">;
type Tailor = Tables<"tailors">;

const TailorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState("");
  const [profileLink, setProfileLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tailor, setTailor] = useState<Tailor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);

  // Order stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('name, role')
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

      setUserName(userData.name);

      // Check if profile exists
      const { data: tailorProfile } = await supabase
        .from('tailors')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!tailorProfile) {
        navigate('/tailor/profile-edit');
      } else {
        setTailor(tailorProfile);
        const link = `${window.location.origin}/tailor/${tailorProfile.slug}`;
        setProfileLink(link);
        
        // Load orders
        await loadOrders(tailorProfile.id);
        
        // Load portfolio styles
        await loadStyles(tailorProfile.id);
        
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, toast]);

  // Real-time subscription for orders
  useEffect(() => {
    if (!tailor?.id) return;

    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tailor_id=eq.${tailor.id}`
        },
        (payload) => {
          console.log('Order change:', payload);
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
            toast({
              title: "New Order!",
              description: "You have received a new order.",
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => 
              o.id === (payload.new as Order).id ? payload.new as Order : o
            ));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tailor?.id, toast]);

  const loadOrders = async (tailorId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tailor_id', tailorId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
  };

  const loadStyles = async (tailorId: string) => {
    const { data, error } = await supabase
      .from('styles')
      .select('*')
      .eq('tailor_id', tailorId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStyles(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth/login');
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(profileLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Your profile link has been copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
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
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">Tailor Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {userName}!</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="availability"
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
              <Label htmlFor="availability" className="text-sm">
                {isAvailable ? "Available" : "Unavailable"}
              </Label>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Order Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-primary">{totalOrders}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-yellow-500">{pendingOrders}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-blue-500">{inProgressOrders}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <CheckCheck className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-green-500">{completedOrders}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-red-500">{cancelledOrders}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Manage Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View and manage all your customer orders
              </p>
              <Button onClick={() => navigate('/tailor/orders')} className="w-full">
                View All Orders
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {styles.length} style{styles.length !== 1 ? 's' : ''} in your portfolio
              </p>
              <Button onClick={() => navigate('/tailor/portfolio')} className="w-full">
                Manage Portfolio
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Profile & Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {tailor?.average_rating && tailor.average_rating > 0 ? (
                  <>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(Number(tailor.average_rating))
                              ? 'text-accent fill-accent'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{Number(tailor.average_rating).toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({tailor.review_count} reviews)</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No ratings yet</span>
                )}
              </div>
              <Button onClick={() => navigate('/tailor/profile-edit')} variant="outline" className="w-full">
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Public Profile Link */}
        {profileLink && (
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg">Your Public Profile Link</CardTitle>
              <p className="text-sm text-muted-foreground">
                Share this link with customers so they can view your profile and place orders
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={profileLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyProfileLink} size="icon">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders Preview */}
        {orders.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="link" onClick={() => navigate('/tailor/orders')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate('/tailor/orders')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {order.customer_name?.charAt(0).toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        order.status === 'completed' ? 'default' : 
                        order.status === 'pending' ? 'secondary' : 
                        order.status === 'cancelled' ? 'destructive' : 'outline'
                      }
                    >
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Portfolio Preview */}
        {styles.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Your Portfolio</CardTitle>
                <Button variant="link" onClick={() => navigate('/tailor/portfolio')}>
                  Manage All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {styles.slice(0, 4).map((style) => (
                  <div key={style.id} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={style.image_url}
                      alt={style.title || 'Portfolio item'}
                      className="w-full h-full object-cover"
                    />
                    {style.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-white text-sm truncate">{style.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default TailorDashboard;
