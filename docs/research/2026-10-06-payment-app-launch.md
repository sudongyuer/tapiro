# Opening a payment app with payee and amount prefilled

Date: 2026-10-06 (fetches ran 2026-10-05 20:44 GMT). Research only. Follows `2026-10-05-duitnow-p2p.md` §3 and §6.

Question: can Tapiro open a poster's bank or e-wallet app on a transfer screen, with the helper and the amount filled in? Tapiro never touches money.

Conventions:

- Every fact has a quote or a raw file, and a URL fetched in this session.
- **[U]** means unverified. **[I]** means my inference.
- AASA = Apple App Site Association, the file that declares universal links.
- AASA files were fetched with `curl` from `https://<domain>/.well-known/apple-app-site-association` and `https://<domain>/apple-app-site-association`. They were cross-checked against Apple's own CDN, `https://app-site-association.cdn-apple.com/a/v1/<domain>`. The CDN is what devices use: "Starting with macOS 11 and iOS 14, apps no longer send requests for apple-app-site-association files directly to your web server. Instead, they send these requests to an Apple-managed content delivery network (CDN)". https://developer.apple.com/documentation/xcode/supporting-associated-domains
- Web search was unavailable in this session. Developer portals were read directly.

## 1. Short answer

- **No app documents a link that opens a P2P transfer screen with payee and amount.** Not one bank. Not one e-wallet. Not Alipay or WeChat.
- Every documented app-to-app payment flow is merchant collection. The money goes to the integrating merchant. That breaks the "never touch money" rule.
- What is documented and safe: open an app's home screen, and hand over data the poster pastes or scans.
- One exception is technically real but undocumented for P2P: an Alipay QR string is an `https://qr.alipay.com/...` URL, and that domain opens Alipay for every path (§2).

## 2. Universal links (AASA evidence)

Bundle IDs come from the App Store search API, `https://itunes.apple.com/search?country=my&entity=software&term=...`:
MAE `com.maybank2u.life`, CIMB OCTO `com.cimb.cimbocto`, RHB `com.rhbgroup.rhbmobilebanking`, HLB Connect `my.com.hongleongconnect.mobileconnect`, MyPB `com.pbb.mypb`, TNG `my.com.tngdigital.wallet`, Boost `my.com.myboost`, Grab `com.grabtaxi.iphone`, Shopee `com.beeasy.shopee.my`, Alipay `com.alipay.iphoneclient`, WeChat `com.tencent.xin`.

| Domain                                                                                                  | Result                                                                             | Paths for the production app                                                                                                                            |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maybank2u.com.my`                                                                                      | 301 to `www.maybank2u.com.my`, which timed out. Apple CDN: `Not Found`             | none                                                                                                                                                    |
| `mae.com.my`                                                                                            | 301 to `http://morris-allen.com.my.well-known/...`. Apple CDN: `Not Found`         | none. [I] Not a Maybank-controlled AASA host                                                                                                            |
| `cimb.com.my`, `www.cimb.com.my`, `cimbclicks.com.my`                                                   | 404. Apple CDN: `Not Found`                                                        | none                                                                                                                                                    |
| `cimb.page.link`                                                                                        | JSON, but only `"V3TLGYWSB6.com.cimbniaga.CIMB.UAT"` (CIMB Niaga, Indonesia, UAT)  | none for OCTO MY                                                                                                                                        |
| `pbebank.com`, `www.pbebank.com`                                                                        | JSON. App `"39HRWDNSUU.com.pbb.mypb"`                                              | `"/link/*"`, `"/provision/*"`. `https://www.pbebank.com/link/` returns "Page Not Found"                                                                 |
| `rhbgroup.com`, `rhb.com.my`                                                                            | HTML "Page Unavailable". Apple CDN: `Not Found`                                    | none                                                                                                                                                    |
| `hlb.com.my`, `hongleongconnect.my`                                                                     | 404. Apple CDN: `Not Found`                                                        | none                                                                                                                                                    |
| `tngdigital.com.my`                                                                                     | JSON, `webcredentials` only, for `...wallet.integration`, `.sandbox`, `.developer` | none                                                                                                                                                    |
| `link.tngdigital.com.my`                                                                                | JSON. App `"Q86K4QC86A.my.com.tngdigital.wallet"`                                  | `"NOT /__/auth/action/"`, `"NOT /__/auth/handler/"`, `"NOT /_/*"`, `"/*"`                                                                               |
| `myboost.com.my`, `myboost.co`                                                                          | HTML or 404. Apple CDN: `Not Found`                                                | none                                                                                                                                                    |
| `myboost.page.link`                                                                                     | JSON. `"KKPXCANAE4.my.com.myboost"`                                                | `"NOT /_/*"`, `"/*"`                                                                                                                                    |
| `myboost.app.link` (Branch; linked from `www.myboost.com.my` as `https://myboost.app.link/P8wmw4WcP6b`) | JSON. `"KKPXCANAE4.my.com.myboost"`                                                | `"/": "*"` except `$web_only=true` and `/e/*`                                                                                                           |
| `grab.com`                                                                                              | JSON. `"C9YMA892DM.com.grabtaxi.iphone"`                                           | `"/access/*"`, `"/download/"`, `"/sg/pay/card/grabpay/"`, `"/ph/pay/grabpaycard/"`, `"/*/grabunlimited/"`, `"/*/food/dine-out/"`. No Malaysian pay path |
| `r.grab.com`                                                                                            | JSON                                                                               | `"/a/*"`, `"/grp/inv/*"`, `"/fa/inv/*"`                                                                                                                 |
| `grab.onelink.me` (AppsFlyer)                                                                           | JSON                                                                               | `"/2695613898/*"`                                                                                                                                       |
| `shopee.com.my`, `s.shopee.com.my`                                                                      | JSON. `"M8HMZY9TX4.com.beeasy.shopee.my"`                                          | `"*"`, `"/"`, minus login, forgot password, `/buyer/w/*`, `*/verify/ivs/*`, `/s/browser/*`                                                              |
| `shopeepay.com.my`                                                                                      | JSON. Same app                                                                     | `"/u/*"`, `"/universal-link/*"`                                                                                                                         |
| `alipay.com`, `www.alipay.com`, `ds.alipay.com`                                                         | 404 or HTML. Apple CDN: `Not Found`                                                | none                                                                                                                                                    |
| `render.alipay.com` (root path only)                                                                    | JSON. `"8H6B3SFEU4.com.alipay.iphoneclient"`                                       | `"p/s/i/?scheme=*"`, `"p/s/ulink/*"`                                                                                                                    |
| `qr.alipay.com`                                                                                         | JSON. `"8H6B3SFEU4.com.alipay.iphoneclient"`                                       | `"*"`                                                                                                                                                   |
| `weixin.qq.com` (root path only)                                                                        | JSON. `"532LCLCWL8.com.tencent.xin"` and others                                    | `"/cgi-bin/newreadtemplate"`, `"/app/*"`                                                                                                                |
| `wxaurl.cn`                                                                                             | JSON. `com.tencent.xin` variants                                                   | `"*"`                                                                                                                                                   |
| `mp.weixin.qq.com`                                                                                      | JSON. Only `com.tencent.mp` (Official Accounts app)                                | `"/mpapp/*"`                                                                                                                                            |
| `wechat.com`                                                                                            | JSON, `webcredentials` only                                                        | none                                                                                                                                                    |

Findings:

- **Five banks (Maybank, CIMB, RHB, HLB, and Public Bank's MyPB in practice) publish no usable universal link.** Apple's CDN has no AASA for Maybank, CIMB, RHB or HLB domains. MyPB's `/link/*` has no public page. [I] No bank transfer screen can be reached by universal link.
- **No AASA path looks like a P2P transfer with parameters.** The only parameter pattern is Alipay's `p/s/i/?scheme=*`. [I] It wraps an `alipays://` scheme in an https URL; it is not documented on opendocs.
- **Catch-all domains** (`link.tngdigital.com.my/*`, `myboost.page.link/*`, `myboost.app.link/*`, `shopee.com.my *`, `qr.alipay.com *`, `wxaurl.cn *`) open the app for any path. Which in-app screen a path reaches is the app's private routing. [U] for every path.
- **`qr.alipay.com` is the one real hit.** Alipay's own API returns QR strings on that domain: `"qr_code": "https://qr.alipay.com/bavh4wjlxf12tper3a"`, described as "当前预下单请求生成的二维码码串，有效时间2小时". https://opendocs.alipay.com/open/05osv9.md. That is a merchant order code. Whether a personal Alipay receive code is also a `qr.alipay.com` URL: **[U]**. [I] If it is, opening the decoded URL opens Alipay on the payee's code. A static code carries no amount.
- `weixin.qq.com/app/*` returned 404 in a browser. Its meaning: **[U]**.

## 3. Official developer docs

### Alipay

- The documented scheme is for mini programs: "scheme 链接常见格式：alipays://platformapi/startapp?appId=[appId]&page=[page]&query=[query]". https://opendocs.alipay.com/mini/018uni.md
- Targets are gated: "若目标跳转的 appid 不在可跳转的名单内，导致无权限访问。" Same URL. [I] Alipay controls which appIds may be opened. Its built-in transfer screens are not on any public list.
- `alipays://` from a merchant app is documented only after merchant payment setup: "当开发者已完成 手机网站支付服务端接入 后可以通过 alipays 协议唤起支付宝 App。" https://opendocs.alipay.com/open/00f7nk.md
- APP支付 pays the merchant; account types include "支付宝个人账号" but still need a business scope. See `2026-10-05-duitnow-p2p.md` §5.
- Alipay+ is for "Acquiring Service Provider/merchant" and "Mobile Payment Provider". https://docs.alipayplus.com/alipayplus/
- The popular `alipays://platformapi/startapp?appId=20000123` (transfer) and `...&qrcode=` forms: **not on any opendocs page I read.** Undocumented. They can break or be blocked by the appId list above.

### WeChat

- Documented mobile-app capabilities are share, login, pay and launch a mini program. The SDK guide lists "分享与收藏、微信登录、微信支付等能力". https://developers.weixin.qq.com/doc/oplatform/Mobile_App/Access_Guide/iOS.html
- Launch a mini program: "用户可以在 App 中跳转至微信某一小程序的指定页面". Needs a reviewed Open Platform app: "开发者在微信开放平台账号下申请移动应用并 通过审核 后，即可获得移动应用拉起小程序功能权限。" https://developers.weixin.qq.com/doc/oplatform/Mobile_App/Launching_a_Mini_Program/Launching_a_Mini_Program.html
- The documented query schemes are "weixin 、 weixinULAPI 、 weixinURLParamsAPI". iOS guide URL above. [I] `weixin://` opening WeChat's home is the only launch target a non-SDK app can rely on.
- WeChat Pay APP支付 is merchant collection (`2026-10-05-duitnow-p2p.md` §5).
- No P2P transfer or personal-code link is documented. `wxp://` personal codes: **[U]**.

### TNG eWallet

- No public developer portal found: `developer.tngdigital.com.my`, `developers.tngdigital.com.my` and `open.tngdigital.com.my` did not respond.
- TNG has a mini program platform: "Mini Program are a new way to connect users and services". https://miniprogram.tngdigital.com.my/index. It does not mention launching TNG from another app.
- [I] No documented entry into TNG's transfer screen.

### GrabPay

- Grab's own site uses a scheme for the app's home: `af_dp=grab%3A%2F%2Fopen%3FscreenType%3DMAIN` inside `https://grab.onelink.me/2695613898?...` on https://www.grab.com/my/pay/ and https://www.grab.com/my/pay/send-money/. Also `grab://open?screenType=GIFTS` on https://www.grab.com/my/.
- [I] `grab://open?screenType=MAIN` is first-party usage, not a developer contract. No `screenType` for transfer appears on Grab's pages.
- `developer.grab.com` renders client-side and returned no readable text. GrabPay Online terms: **[U]**.

### ShopeePay

- Merchant only: "Start by contacting ShopeePay's integration team to sign the NDA (Non-Disclosure Agreement) and commercial agreement." https://product.shopeepay.com/integration/get-started
- Checkout redirects to the app, but for a merchant: the customer "is redirected to ShopeePay or Shopee application to continue the payment"; merchants "accept one-time payments through ShopeePay". https://product.shopeepay.com/products/online-payments/checkout-with-shopeepay

### Boost

- No developer portal responded (`developer.myboost.com.my`, `developers.myboost.com.my`, `developer.myboost.co`). [U]

### DuitNow Request (RTP)

- Network product for merchants: "DuitNow Request enables Merchants/Billers to send payment requests to Customers, which appear in the Customer’s e-banking inbox (Internet or Mobile Banking)." The page lists "Acquirer API" and "Acquirer Webhooks". Text from the page payload of https://docs.paynet.my/docs/request/overview
- [I] A non-licensed app cannot send an RTP. Funds would go to a merchant. Helpers can still send a Request from their own bank app (`2026-10-05-duitnow-p2p.md` §4).

## 4. Apple platform rules

- `open(_:options:)`: "If the specified URL scheme is handled by another app, iOS launches that app and passes the URL to it." https://developer.apple.com/documentation/uikit/uiapplication/open(_:options:completionhandler:)
- Not bound by the query list: "Unlike this method, the open method isn’t constrained by the LSApplicationQueriesSchemes requirement." https://developer.apple.com/documentation/uikit/uiapplication/canopenurl(_:)
- Query list limit: "Apps linked on or after iOS 27 are limited to a maximum of 25 entries in the LSApplicationQueriesSchemes key." Same URL.
- Detect without a query list: `universalLinksOnly` "opens the URL only if the URL is a valid universal link and there is an installed app capable of opening that URL." https://developer.apple.com/documentation/uikit/uiapplication/openexternalurloptionskey/universallinksonly. [I] Useful for TNG, Boost, Shopee, Alipay. Not for the banks.
- Fallback: "if no app is available to handle a universal link, iOS routes it to the person’s default browser". canOpenURL URL above.
- AASA hosting: "You must host the file using https:// with a valid certificate and with no redirects." https://developer.apple.com/documentation/xcode/supporting-associated-domains. [I] Maybank's 301 alone would disqualify `maybank2u.com.my`.
- Third-party terms: "If your app uses, accesses, monetizes access to, or displays content from a third-party service, ensure that you are specifically permitted to do so under the service’s terms of use. Authorization must be provided upon request." https://developer.apple.com/app-store/review/guidelines/ (5.2.2). [I] Using an undocumented transfer scheme gives Tapiro no authorization to show.
- Wallet terms on unofficial access: Alipay and WeChat user agreements render client-side. **[U]**.

## 5. Per-app table

"Open app" means the home screen or the app's own landing page. Nothing below reaches a prefilled P2P transfer through a documented route.

| App                    | Open app (how)                                                                              | Transfer screen  | Prefill payee                                            | Prefill amount      | Documented?                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------- | ------------------- | ---------------------------------------------- |
| Maybank MAE            | Custom scheme only, name [U]                                                                | No               | No                                                       | No                  | No AASA (CDN Not Found); no scheme published   |
| CIMB OCTO              | Custom scheme only, name [U]                                                                | No               | No                                                       | No                  | No AASA for OCTO MY                            |
| Public Bank MyPB       | Universal link `pbebank.com/link/*` (purpose [U])                                           | No               | No                                                       | No                  | AASA only; no public doc                       |
| RHB                    | Custom scheme only, name [U]                                                                | No               | No                                                       | No                  | No AASA                                        |
| HLB Connect            | Custom scheme only, name [U]                                                                | No               | No                                                       | No                  | No AASA                                        |
| TNG eWallet            | Universal link `link.tngdigital.com.my/*`                                                   | [U]              | No                                                       | No                  | AASA only; no developer doc                    |
| Boost                  | Universal link `myboost.app.link/*`, `myboost.page.link/*`                                  | [U]              | No                                                       | No                  | AASA only; no developer doc                    |
| GrabPay (Grab app)     | `grab://open?screenType=MAIN` (seen on grab.com)                                            | No               | No                                                       | No                  | First-party usage, not a developer contract    |
| ShopeePay (Shopee app) | Universal link `shopee.com.my/*`, `shopeepay.com.my/u/*`                                    | [U]              | No                                                       | No                  | Merchant checkout only (NDA)                   |
| Alipay                 | `alipays://` (documented for merchants and mini programs); universal link `qr.alipay.com/*` | Via a QR URL [U] | Only by opening the payee's own `qr.alipay.com` code [U] | No for static codes | Transfer appIds undocumented and gated         |
| WeChat                 | `weixin://` (listed in WeChat's iOS guide)                                                  | No               | No                                                       | No                  | Only share, login, merchant pay, mini programs |

## 6. Documented "fill the info" alternatives

- **Copy, then open.** Copy the DuitNow ID, amount and reference. Then open the app's home. Opening is documented for iOS (§4). Scheme names for the five banks: **[U]**; test on device.
- **QR on screen, second phone.** Show the helper's static QR full screen. Works with any app's camera scanner. PayNet confirms the flow: "Scan the recipient’s QR code and key in the amount." (`2026-10-05-duitnow-p2p.md` §1)
- **Save QR to Photos, then "scan from album" in the payer app.** No help page confirms album import for any of the nine Malaysian apps. Fresh Zendesk searches for "gallery", "photo album", "QR image" and "upload QR" on `support.myboost.co` and `support.tngdigital.com.my` returned no QR-import article (top hits were eSIM, claims and DuitNow fee articles). **[U]** for all, Alipay and WeChat included.
- **Share sheet "Open in".** No bank or e-wallet documents a share extension that accepts a QR image. **[U]**.
- **Alipay only:** if the helper uploads an Alipay code, Tapiro can decode it. If the payload is an `https://qr.alipay.com/...` URL, opening it hands the code to Alipay through a published universal link. Undocumented for personal codes, and personal-code business use is restricted (`2026-10-05-duitnow-p2p.md` §5). [I] Do not ship this for Malaysian P2P.

## 7. Best achievable UX

Built only on documented pieces. Tapiro never builds or alters a payment instruction.

1. "Pay [helper]" sheet: amount, DuitNow ID, reference, each with **Copy**. One **Copy all** that copies the DuitNow ID first, since it is the field the bank asks for first.
2. "Open my bank app" row. The poster picks once. Tapiro opens:
   - TNG, Boost, Shopee: their root universal link with `universalLinksOnly`, so a missing app fails silently instead of opening Safari. Root-path behaviour: test on device.
   - Grab: `grab://open?screenType=MAIN`.
   - Banks: a custom scheme only after a device test confirms it opens the app. Else hide the button and show "Open your bank app and choose DuitNow".
3. Helper QR full screen for a second phone. **Save to Photos** stays secondary until device tests confirm album import.
4. The helper may send a DuitNow Request from their own bank app. This is the only flow where the payer sees the amount prefilled, and it happens inside the payer's bank app.
5. "I've paid" / "Received" as in `2026-10-05-duitnow-p2p.md`.

## 8. What would change this answer

- A bank publishing a DuitNow transfer universal link. Re-check the CDN URLs above each quarter.
- PayNet opening DuitNow Request to non-merchant initiators.
- Device tests (per app, one hour each): does the root universal link or scheme open the app? Does the scanner import from Photos? Does a share-sheet "Open in" exist?
- Written confirmation from TNG, Boost, Grab or Shopee that a deep link is supported for third parties.
