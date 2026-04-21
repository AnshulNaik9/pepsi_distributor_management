import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Package, Truck, Users, 
  Map as MapIcon, Tag, IndianRupee, LogOut,
  TrendingUp, Trophy, Star, Menu
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  useSidebar
} from "@/components/ui/sidebar";

const adminMenu = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Profit Pulse", url: "/admin/profit-pulse", icon: TrendingUp },
  { title: "Top Performers", url: "/admin/top-performers", icon: Trophy },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Godown Stock", url: "/admin/stock", icon: Package },
  { title: "Trucks & Loading", url: "/admin/trucks", icon: Truck },
  { title: "Customers", url: "/admin/customers", icon: Users },
  { title: "Routes", url: "/admin/routes", icon: MapIcon },
  { title: "Offers", url: "/admin/offers", icon: Tag },
  { title: "Bill History", url: "/admin/orders", icon: IndianRupee },
  { title: "Special Order", url: "/admin/special-order", icon: Star },
];

function SidebarNavContent({ location }: { location: string }) {
  const { setOpenMobile, isMobile } = useSidebar();

  return (
    <>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-xl text-foreground">DistriSys</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className={`
                      rounded-lg my-0.5 transition-all duration-200
                      ${location === item.url 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                        : 'hover:bg-primary/5 hover:text-primary text-muted-foreground'
                      }
                    `}
                  >
                    <Link 
                      href={item.url} 
                      className="flex items-center gap-3 px-3 py-2.5"
                      onClick={() => { if (isMobile) setOpenMobile(false); }}
                    >
                      <item.icon className={`w-5 h-5 ${location === item.url ? 'text-primary-foreground' : ''}`} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto absolute bottom-4 w-[calc(100%-1.5rem)]">
          <SidebarGroupContent>
             <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Link 
                    href="/" 
                    className="flex items-center gap-3 px-3 py-2.5"
                    onClick={() => { if (isMobile) setOpenMobile(false); }}
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Exit Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-border/50 shadow-sm z-20">
          <SidebarNavContent location={location} />
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0 bg-secondary/30">
          <header className="flex items-center h-14 md:h-16 px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-10">
            <SidebarTrigger className="mr-3 h-9 w-9 md:hidden" />
            <div className="md:hidden font-display font-bold text-lg text-foreground">DistriSys</div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-xs md:text-sm font-medium text-muted-foreground">Admin Panel</div>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                A
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
