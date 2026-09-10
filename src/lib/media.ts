import type { ImageAsset } from "@/types/common";

/**
 * MEDIA REGISTRY
 * ------------------------------------------------------------------
 * All demo photography is referenced from this single file so it can be
 * swapped for the business's own product photography (cloud storage/CDN)
 * without touching components. Demo images: Unsplash License.
 */

const UNSPLASH = "https://images.unsplash.com";

function photo(id: string, alt: string, width = 1600, height = 2000): ImageAsset {
  return {
    url: `${UNSPLASH}/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`,
    alt,
    width,
    height,
  };
}

/** Landscape crop for heroes and wide editorial panels. */
function wide(id: string, alt: string) {
  return photo(id, alt, 2400, 1500);
}

/** Portrait crop for mobile heroes and lifestyle panels. */
function tall(id: string, alt: string) {
  return photo(id, alt, 1200, 1700);
}

/** 4:5 crop — the product grid ratio. */
function product(id: string, alt: string) {
  return photo(id, alt, 1200, 1500);
}

export const media = {
  hero: {
    bridal: wide("photo-1610173826014-d131b02d69ca", "Bride in a red and gold sari wearing layered gold jewellery"),
    bridalMobile: tall("photo-1600685890506-593fdf55949b", "Bride in red bridal attire with ornate gold jewellery"),
    bangles: wide("photo-1758995116383-f51775896add", "A stack of ornate gold bangles on a dark surface"),
    banglesMobile: tall("photo-1771734065116-61e16b353ded", "Close-up of a gold chain against a dark background"),
    silver: wide("photo-1573408301185-9146fe634ad0", "Silver jewellery set with clear gemstones on black"),
    silverMobile: tall("photo-1786052351994-37c1af4c55d7", "Silver chain bracelets reflected on a mirror"),
    chain: wide("photo-1611107683227-e9060eccd846", "Gold chain necklace resting on a white surface"),
    chainMobile: tall("photo-1705326454924-f6777522b030", "Gold necklace displayed on a white bust"),
  },
  editorial: {
    goldLifestyle: tall("photo-1594140700783-f9e70c7abc25", "Woman in a gold and red sari wearing traditional gold jewellery"),
    goldDetail: tall("photo-1617633150878-7df1d12a9a57", "Detail of gold jewellery worn with a red and gold sari"),
    silverLifestyle: tall("photo-1761222101900-9c9e34fac2ce", "Arms adorned with delicate silver bracelets"),
    silverDetail: tall("photo-1786052351994-37c1af4c55d7", "Silver chain bracelets reflected on a mirror"),
    timeless: tall("photo-1611652022451-d55126758521", "Woman in a white dress wearing a fine gold necklace"),
    timelessWide: wide("photo-1613966561243-c6959a886009", "Woman wearing a fine gold necklace"),
    festival: tall("photo-1641382161166-4f3c320f0c6d", "Woman in festive gold and red attire wearing gold jewellery"),
    festivalWide: wide("photo-1758995116383-f51775896add", "Ornate gold bangles stacked on a dark surface"),
    celebration: tall("photo-1756483560049-e7b2208f99a0", "Smiling woman adorned in traditional Indian jewellery"),
    custom: tall("photo-1698495386518-5e21688bc27b", "Hand wearing a finely crafted ring"),
    customDetail: tall("photo-1631982690223-8aa4be0a2497", "Three gold rings presented in a white box"),
    proposal: wide("photo-1706955008775-c00874bb4d4b", "A ring being placed on a finger"),
    craftsmanship: wide("photo-1758995115518-26f90aa61b97", "Gold necklace with intricate bead detailing on velvet"),
    craftsmanshipDetail: tall("photo-1758995115682-1452a1a9e35b", "Gold necklace and matching earrings on display"),
    showcase: wide("photo-1626136978522-b67ac41126e9", "A display case filled with fine jewellery"),
    showcaseTall: tall("photo-1650389236412-e7413cbcf2fe", "A jewellery display case in a showroom"),
    store: tall("photo-1724986481830-4e7b781c2bd1", "Jewellery displayed on a table in a showroom"),
    storeWide: wide("photo-1768359666502-306694fa6fcf", "Gold bracelets displayed in a jewellery showroom"),
    bridalPortrait: tall("photo-1570212773364-e30cd076539e", "Bride in a wedding sari looking downward"),
    heritage: tall("photo-1688382654723-a7366006519b", "Woman wearing a green sari with heritage jewellery"),
  },
  categories: {
    gold: product("photo-1758995115682-1452a1a9e35b", "Gold necklace and matching earrings"),
    silver: product("photo-1631050164355-822f8ab7dcb9", "Silver necklace on white paper"),
    rings: product("photo-1631982690223-8aa4be0a2497", "Three gold rings in a white box"),
    earrings: product("photo-1727990865600-91f8cb8b0168", "Pair of gold earrings on a white sheet"),
    necklaces: product("photo-1705326454924-f6777522b030", "Gold necklace displayed on a white bust"),
    chains: product("photo-1585711715631-1e6bf224f092", "Gold chain necklace on grey fabric"),
    bracelets: product("photo-1602173574767-37ac01994b2a", "Gold chain bracelet"),
    bangles: product("photo-1679156271456-d6068c543ee7", "Gold bangles on a table"),
    pendants: product("photo-1569397288884-4d43d6738fbd", "Gold pendant necklace"),
    mangalsutra: product("photo-1719861837593-91dbdd0ed5a0", "Beaded necklace with gold and dark beads"),
    men: product("photo-1613498510372-8901cad084a2", "Man wearing a gold chain"),
    women: product("photo-1611652022451-d55126758521", "Woman wearing a fine gold necklace"),
    kids: product("photo-1623302312645-65df66384692", "Gold chain with a small teddy bear charm"),
    custom: product("photo-1698495386518-5e21688bc27b", "Hand wearing a finely crafted ring"),
  },
  instagram: [
    photo("photo-1633934542430-0905ccb5f050", "Rings and a necklace styled together", 900, 900),
    photo("photo-1585960622850-ed33c41d6418", "Gold necklace worn with a white shirt", 900, 900),
    photo("photo-1620656798579-1984d9e87df7", "Layered gold necklace worn with black", 900, 900),
    photo("photo-1616837874254-8d5aaa63e273", "Gold necklace worn with a black blazer", 900, 900),
    photo("photo-1601821765780-754fa98637c1", "Gold necklace worn with a white shirt", 900, 900),
    photo("photo-1623040593884-0044b3ce4ff9", "Hand wearing two rings", 900, 900),
    photo("photo-1777817118010-ee0ded8a7823", "Arms crossed wearing stacked bracelets", 900, 900),
    photo("photo-1594140700520-8afea3283e2c", "Woman wearing green and gold earrings", 900, 900),
  ],
} as const;

/** Build a product image asset from an Unsplash photo id (demo data only). */
export function productPhoto(id: string, alt: string): ImageAsset {
  return product(id, alt);
}

export function lifestylePhoto(id: string, alt: string): ImageAsset {
  return tall(id, alt);
}
