-- Sayt navigatsiyasi ma'lumot sifatida. [TZ 41]
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "parentId" UUID,
    "labelUz" TEXT NOT NULL,
    "labelRu" TEXT NOT NULL,
    "noteUz" TEXT,
    "noteRu" TEXT,
    "targetType" TEXT NOT NULL,
    "targetValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "menu_items_location_parentId_sortOrder_idx"
    ON "menu_items"("location", "parentId", "sortOrder");

-- Ota o'chirilsa bolalari ham ketadi: yetim bo'lim menyuda
-- ko'rinmaydigan, lekin bazada qoladigan axlatga aylanardi.
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "menu_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
