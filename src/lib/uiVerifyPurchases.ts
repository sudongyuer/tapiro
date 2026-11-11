let bought = 0;

export const uiVerifyPurchases = {
  coins: () => bought,
  add(coins: number) {
    bought += coins;
  },
};
