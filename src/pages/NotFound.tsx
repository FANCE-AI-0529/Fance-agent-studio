import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-4">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-7xl font-bold text-primary mb-2">404</h1>
        </div>
        
        <h2 className="text-2xl font-semibold mb-2">页面不存在</h2>
        <p className="text-muted-foreground mb-8">
          抱歉，您访问的页面不存在或已被移除。请检查网址是否正确，或返回首页。
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回上一页
          </Button>
          <Button asChild className="gap-2">
            <a href="/">
              <Home className="h-4 w-4" />
              返回首页
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
