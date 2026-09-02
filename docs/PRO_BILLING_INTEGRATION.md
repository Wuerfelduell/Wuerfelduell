# DiceDuel Pro billing bridge

The web client never trusts a save file, LocalStorage value, URL parameter, or imported profile as proof of subscription.

A native/store layer must expose `window.DiceDuelBilling` (or `window.WD_BILLING_PROVIDER`) with:

```js
{
  async getEntitlement({ productIds, feature }) {
    return {
      active: true,
      verified: true,
      source: "google-play", // or app-store / stripe-backend / firebase-functions / server
      productId: "diceduel_pro_yearly",
      expiresAt: "2027-09-02T00:00:00.000Z"
    };
  },
  async purchase({ productId }) { /* launch native purchase and verify server-side */ },
  async restore({ productIds }) { /* restore and verify receipts server-side */ }
}
```

`verified: true` must only be returned after receipt/token verification through a trusted backend or an equally trusted native provider. Do not implement this flag from client-owned storage.

Product IDs:

- `diceduel_pro_monthly`
- `diceduel_pro_yearly`

Pro unlocks analytics, local history, loadouts, themes, and profile cosmetics. It must not modify HP, damage, dice odds, abilities, enemy values, campaign access, or matchmaking power.
