import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Quotes = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground">Gerencie seus orçamentos</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Quotes;