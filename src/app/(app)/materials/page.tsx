import { redirect } from "next/navigation";
import { Boxes, Layers, Ruler } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { BOX_SPEC_ROLES, PRICING_ADMIN_ROLES } from "@/lib/auth/permissions";
import { listBoxSpecs, listMaterials, listProcessRates } from "@/lib/data/materials";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsTable } from "./materials-columns";
import { ProcessRatesTable } from "./process-rates-columns";
import { BoxSpecsTable } from "./box-specs-columns";
import { MaterialFormSheet } from "./material-form-sheet";
import { ProcessRateFormSheet } from "./process-rate-form-sheet";
import { BoxSpecFormSheet } from "./box-spec-form-sheet";

export default async function MaterialsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [materials, processRates, boxSpecs] = await Promise.all([
    listMaterials(user),
    listProcessRates(user),
    listBoxSpecs(user),
  ]);

  const canEditPricing = PRICING_ADMIN_ROLES.includes(user.role);
  const canEditBoxSpecs = BOX_SPEC_ROLES.includes(user.role);
  const materialOptions = materials.map((m) => ({
    id: m.id,
    name: m.name,
    sheetWidthIn: m.sheetWidthIn,
    sheetLengthIn: m.sheetLengthIn,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Materials & Pricing</h1>
        <p className="text-sm text-muted-foreground">
          The rates behind every quotation. {canEditPricing ? "" : "Master pricing is admin-only — you have read access."}
        </p>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">
            <Layers className="size-3.5" /> Materials
          </TabsTrigger>
          <TabsTrigger value="rates">
            <Ruler className="size-3.5" /> Process Rates
          </TabsTrigger>
          <TabsTrigger value="box-specs">
            <Boxes className="size-3.5" /> Box Specs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{materials.length} materials</p>
            {canEditPricing && <MaterialFormSheet />}
          </div>
          <MaterialsTable
            data={materials}
            canEdit={canEditPricing}
            searchPlaceholder="Search materials..."
            emptyState={<span className="text-sm text-muted-foreground">No materials yet.</span>}
          />
        </TabsContent>

        <TabsContent value="rates" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{processRates.length} process rates</p>
            {canEditPricing && <ProcessRateFormSheet />}
          </div>
          <ProcessRatesTable
            data={processRates}
            canEdit={canEditPricing}
            searchPlaceholder="Search process rates..."
            emptyState={<span className="text-sm text-muted-foreground">No process rates yet.</span>}
          />
        </TabsContent>

        <TabsContent value="box-specs" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{boxSpecs.length} box specs</p>
            {canEditBoxSpecs && <BoxSpecFormSheet materials={materialOptions} />}
          </div>
          <BoxSpecsTable
            data={boxSpecs}
            materials={materialOptions}
            canEdit={canEditBoxSpecs}
            searchPlaceholder="Search box specs..."
            emptyState={
              <span className="text-sm text-muted-foreground">
                No box specs yet. {materials.length === 0 && "Add a material first."}
              </span>
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
