import { storage } from "../server/storage";

async function addOffers() {
  const products = await storage.getProducts();
  const aquafina = products.find(p => p.name.toLowerCase().includes("aquafina") && (p.name.includes("1L") || p.name.includes("1 Ltr")));
  
  if (!aquafina) {
    console.error("Aquafina 1L not found");
    return;
  }

  const targets = [
    { search: ["7", "up", "2.25"], label: "7Up 2.25L" },
  ];

  for (const t of targets) {
    const product = products.find(p => {
        const name = p.name.toLowerCase();
        return t.search.every(term => name.includes(term.toLowerCase()));
    });

    if (product) {
      console.log(`Matching Product Found: ${product.name}`);
      await storage.createOffer({
        name: `Buy 1 ${product.name} Get 2 Aquafina Free`,
        buyProductId: product.id,
        buyQuantity: 1,
        freeProductId: aquafina.id,
        freeQuantity: 2,
        isActive: true
      });
      console.log(`Added offer for ${product.name}`);
    } else {
      console.log(`Product ${t.label} not found (search: ${t.search.join(",")})`);
    }
  }
}

addOffers().catch(console.error);
