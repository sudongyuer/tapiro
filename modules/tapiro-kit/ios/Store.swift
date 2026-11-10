import StoreKit
import UIKit

actor Store {
  typealias Emit = @Sendable ([String: Any]) -> Void

  private var pending: [String: Transaction] = [:]
  private var updates: Task<Void, Never>?

  func products(ids: [String]) async -> [String: Any] {
    do {
      let products = try await Product.products(for: ids)
      return [
        "status": "ok",
        "products": products.map { product in
          [
            "id": product.id,
            "displayName": product.displayName,
            "displayPrice": product.displayPrice,
            "price": NSDecimalNumber(decimal: product.price).doubleValue,
            "currencyCode": product.priceFormatStyle.currencyCode,
          ] as [String: Any]
        },
      ]
    } catch {
      return ["status": "failed", "code": Self.code(for: error)]
    }
  }

  func purchase(productId: String, accountToken: String) async -> [String: Any] {
    guard let token = UUID(uuidString: accountToken) else { return ["status": "failed", "code": "invalidToken"] }
    guard AppStore.canMakePayments else { return ["status": "notAllowed"] }
    let product: Product
    do {
      guard let found = try await Product.products(for: [productId]).first else {
        return ["status": "failed", "code": "unknownProduct"]
      }
      product = found
    } catch {
      return ["status": "failed", "code": Self.code(for: error)]
    }
    guard let scene = await Self.activeScene() else { return ["status": "failed", "code": "noScene"] }
    do {
      switch try await product.purchase(confirmIn: scene, options: [.appAccountToken(token)]) {
      case .success(let result):
        return ["status": "purchased", "transaction": record(result, source: "purchase")]
      case .pending:
        return ["status": "pending"]
      case .userCancelled:
        return ["status": "cancelled"]
      @unknown default:
        return ["status": "failed", "code": "unknown"]
      }
    } catch {
      switch Self.code(for: error) {
      case "notAllowed": return ["status": "notAllowed"]
      case "cancelled": return ["status": "cancelled"]
      case let code: return ["status": "failed", "code": code]
      }
    }
  }

  func startUpdates(emit: @escaping Emit) {
    guard updates == nil else { return }
    updates = Task { [weak self] in
      for await result in Transaction.updates {
        guard let self else { return }
        emit(await self.record(result, source: "updates"))
      }
    }
  }

  func stopUpdates() {
    updates?.cancel()
    updates = nil
  }

  func unfinished() async -> [[String: Any]] {
    var out: [[String: Any]] = []
    for await result in Transaction.unfinished {
      out.append(record(result, source: "unfinished"))
    }
    return out
  }

  func revoked() async -> [[String: Any]] {
    var out: [[String: Any]] = []
    for await result in Transaction.all where result.unsafePayloadValue.revocationDate != nil {
      out.append(record(result, source: "history"))
    }
    return out
  }

  func finish(transactionId: String) async -> Bool {
    if let transaction = pending.removeValue(forKey: transactionId) {
      await transaction.finish()
      return true
    }
    for await result in Transaction.unfinished {
      if case .verified(let transaction) = result, String(transaction.id) == transactionId {
        await transaction.finish()
        return true
      }
    }
    return false
  }

  // Unverified transactions are reported with their JWS but never kept for finish(): the server decides, and an
  // unverified one stays unfinished so StoreKit delivers it again.
  private func record(_ result: VerificationResult<Transaction>, source: String) -> [String: Any] {
    let transaction = result.unsafePayloadValue
    let id = String(transaction.id)
    var body: [String: Any] = [
      "source": source,
      "transactionId": id,
      "originalTransactionId": String(transaction.originalID),
      "productId": transaction.productID,
      "jws": result.jwsRepresentation,
      "environment": transaction.environment.rawValue,
      "revoked": transaction.revocationDate != nil,
      "verified": false,
    ]
    if case .verified(let verified) = result {
      body["verified"] = true
      pending[id] = verified
    }
    return body
  }

  @MainActor
  private static func activeScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
  }

  private static func code(for error: Error) -> String {
    if let error = error as? StoreKitError {
      switch error {
      case .networkError: return "network"
      case .userCancelled: return "cancelled"
      case .notAvailableInStorefront: return "notAvailable"
      case .notEntitled: return "notEntitled"
      case .systemError: return "system"
      case .unsupported: return "unsupported"
      default: return "unknown"
      }
    }
    if let error = error as? Product.PurchaseError {
      switch error {
      case .purchaseNotAllowed: return "notAllowed"
      case .productUnavailable: return "unknownProduct"
      default: return "invalidPurchase"
      }
    }
    return "unknown"
  }
}
