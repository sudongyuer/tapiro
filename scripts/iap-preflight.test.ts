import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { compareProducts, storekitProducts } from './iap-preflight.mjs';

const IDS = ['app.tapiro.coins.5', 'app.tapiro.coins.11', 'app.tapiro.coins.35'];
const storekit = IDS.map((productId) => ({ productId, type: 'Consumable' }));
const asc = (ids: string[], type = 'CONSUMABLE') =>
  ids.map((productId) => ({ productId, type, state: 'READY_TO_SUBMIT' }));

describe('iap preflight', () => {
  test('every product in App Store Connect passes', () => {
    expect(compareProducts({ server: IDS, storekit, asc: asc(IDS) })).toEqual([]);
  });

  test('App Store Connect with no product names each missing one', () => {
    expect(compareProducts({ server: IDS, storekit, asc: [] })).toEqual([
      'app.tapiro.coins.11 is missing from App Store Connect, so StoreKit cannot load its price',
      'app.tapiro.coins.35 is missing from App Store Connect, so StoreKit cannot load its price',
      'app.tapiro.coins.5 is missing from App Store Connect, so StoreKit cannot load its price',
    ]);
  });

  test('one missing product fails even when the others exist', () => {
    expect(compareProducts({ server: IDS, storekit, asc: asc(IDS.slice(0, 2)) })).toEqual([
      'app.tapiro.coins.35 is missing from App Store Connect, so StoreKit cannot load its price',
    ]);
  });

  test('a server pack absent from the StoreKit file and App Store Connect is reported twice', () => {
    const problems = compareProducts({
      server: [...IDS, 'app.tapiro.coins.99'],
      storekit,
      asc: asc(IDS),
    });
    expect(problems).toEqual([
      'app.tapiro.coins.99 is in iap_products but not in Tapiro.storekit',
      'app.tapiro.coins.99 is missing from App Store Connect, so StoreKit cannot load its price',
    ]);
  });

  test('a StoreKit-only product is reported', () => {
    expect(compareProducts({ server: IDS.slice(1), storekit, asc: asc(IDS) })).toEqual([
      'app.tapiro.coins.5 is in Tapiro.storekit but not in iap_products',
    ]);
  });

  test('a product of the wrong type fails', () => {
    expect(
      compareProducts({
        server: IDS,
        storekit,
        asc: [...asc(IDS.slice(1)), ...asc(IDS.slice(0, 1), 'NON_CONSUMABLE')],
      }),
    ).toEqual(['app.tapiro.coins.5 is NON_CONSUMABLE in App Store Connect, not CONSUMABLE']);
  });

  test('the StoreKit file lists the three coin packs', () => {
    const text = readFileSync(join(import.meta.dir, '../ios-config/Tapiro.storekit'), 'utf8');
    expect(storekitProducts(text).map((product) => product.productId)).toEqual(IDS);
  });
});
