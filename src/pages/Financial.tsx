import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Financial = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Controle de entradas, saídas e contas</p>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="receivable">Contas a Receber</TabsTrigger>
            <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Entradas e Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Nenhuma transação registrada ainda.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receivable" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contas a Receber</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Nenhuma conta a receber registrada ainda.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payable" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contas a Pagar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Nenhuma conta a pagar registrada ainda.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Financial;