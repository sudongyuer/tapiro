import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import * as ts from 'typescript';

type Lifetime = 'session' | 'account' | `kept: ${string}`;

const LIFETIMES: Record<string, Lifetime> = {
  'src/features/account/services.ts#onboardingStore':
    'kept: keyed by user id; account deletion clears it through accountActions',
  'src/features/account/services.ts#profileStore': 'session',
  'src/features/account/services.ts#accountActions': 'kept: holds no user data',
  'src/features/ask/services.ts#deviceStorage': 'kept: a storage adapter',
  'src/features/ask/services.ts#consentStore': 'session',
  'src/features/ask/services.ts#memoryStore': 'session',
  'src/features/ask/services.ts#pantryStore': 'session',
  'src/features/ask/services.ts#cloudCall': 'kept: reads the consent store, holds no user data',
  'src/features/ask/services.ts#askSession': 'session',
  'src/features/ask/services.ts#translationStorage': 'kept: a storage adapter',
  'src/features/ask/services.ts#translations': 'session',
  'src/features/ask/services.ts#voice': 'session',
  'src/features/block/blockEvents.ts#blockEvents': 'kept: an event bus',
  'src/lib/storefront/instance.ts#storefront':
    'kept: the device App Store storefront, not tied to a Tapiro account',
  'src/features/bounty/apply/services.ts#noteDrafts': 'session',
  'src/features/bounty/board/services.ts#originStore': 'account',
  'src/features/bounty/board/services.ts#shownOrigins': 'account',
  'src/features/bounty/board/services.ts#viewStore': 'account',
  'src/features/bounty/live/services.ts#liveBountyStore': 'session',
  'src/features/bounty/map/boardLink.ts#linked': 'kept: the mounted board screen',
  'src/features/bounty/map/boardLink.ts#startRegion': 'kept: a map camera',
  'src/features/bounty/map/boardLink.ts#listeners': 'kept: subscribers',
  'src/features/bounty/post/draftStorage.ts#settingsDraftStorage': 'kept: a storage adapter',
  'src/features/bounty/post/postSheet.ts#close': 'kept: the mounted sheet',
  'src/features/bounty/post/services.ts#draftStore': 'account',
  'src/features/bounty/post/useAiFill.ts#aiFills':
    'kept: carries its user id and is cleared when the form unmounts',
  'src/features/bounty/post/useDraft.ts#formError': 'kept: a notice of the open form',
  'src/features/bounty/post/useStartPost.ts#hintGate': 'kept: which form is focused',
  'src/features/bounty/shared/bountyCache.ts#bountyCache': 'session',
  'src/features/bounty/shared/justApplied.ts#justApplied': 'session',
  'src/features/bounty/status/services.ts#issueDrafts': 'session',
  'src/features/chat/services.ts#outbox': 'account',
  'src/features/chat/services.ts#chatDrafts': 'account',
  'src/features/chat/services.ts#chatStore': 'session',
  'src/features/chat/services.ts#chatImages': 'session',
  'src/features/chat/services.ts#itemThreads': 'kept: drops its cache when the chat user changes',
  'src/features/coins/services.ts#codeDrafts': 'account',
  'src/features/coins/services.ts#coinsStore': 'session',
  'src/features/coins/services.ts#purchaseStore': 'session',
  'src/features/home/HomeScreen.tsx#markShownOneTime': 'kept: card ids shown in this launch',
  'src/features/payee/services.ts#payeeStore': 'session',
  'src/features/payment/services.ts#paymentStore': 'session',
  'src/features/place/placePick.ts#placePick': 'session',
  'src/features/reputation/services.ts#reviewDrafts': 'account',
  'src/features/reputation/services.ts#reviewStore': 'session',
  'src/features/reputation/services.ts#profileStore': 'session',
  'src/features/reputation/services.ts#meStore': 'session',
  'src/features/reputation/services.ts#growMarks': 'account',
  'src/features/ride/create/useRideDraft.ts#rideFormError': 'kept: a notice of the open form',
  'src/features/ride/detail/drafts.ts#applyNotes': 'session',
  'src/features/ride/detail/drafts.ts#detailsDrafts': 'session',
  'src/features/ride/detail/drafts.ts#splitDrafts': 'session',
  'src/features/ride/detail/drafts.ts#disputeNotes': 'session',
  'src/features/ride/services.ts#rideReminders': 'session',
  'src/features/ride/services.ts#rideDraftStore': 'account',
  'src/features/ride/services.ts#recentRoutes': 'account',
  'src/features/ride/services.ts#shortNameRows': 'kept: place short names, the same for everyone',
  'src/features/ride/services.ts#shown': 'session',
  'src/features/ride/services.ts#closeSheet': 'kept: the mounted sheet',
  'src/features/stickers/bookView.ts#bookViewStore': 'account',
  'src/features/stickers/bookView.ts#seed': 'kept: a verify-mode seed',
  'src/lib/deviceClock.ts#clockStyle': 'kept: the app language and the device hour cycle',
  'src/lib/drafts/inbox.ts#bountyDraftInbox': 'session',
  'src/lib/handArt/arrival.ts#pending': 'kept: a one-minute arrival mark for a bounty id',
  'src/lib/homeSignals.ts#liveCardsOnScreen': 'kept: home layout signal',
  'src/lib/homeSignals.ts#revealRequests': 'kept: home layout signal',
  'src/lib/homeSignals.ts#topRequests': 'kept: home layout signal',
  'src/lib/i18n/index.tsx#i18next': 'kept: the language',
  'src/lib/i18n/storage.ts#verifyChoice': 'kept: the language',
  'src/lib/intlCache.ts#dateFormats': 'kept: locale formatters, no account data',
  'src/lib/intlCache.ts#numberFormats': 'kept: locale formatters, no account data',
  'src/lib/live-activity/instance.ts#liveActivities':
    'kept: sign-out ends activities before the session ends (accountActions.beforeSignOut)',
  'src/lib/live/instance.ts#live': 'kept: the realtime connection follows the auth session',
  'src/lib/location/expoLocationService.ts#expoLocationService': 'kept: a device service',
  'src/lib/notifications/index.ts#permissionAnswers': 'kept: a device permission signal',
  'src/lib/notifications/useNoticeRouting.ts#handled': 'kept: notification ids already routed',
  'src/lib/push/instance.ts#deviceToken': 'kept: the device push token',
  'src/lib/push/instance.ts#pushRegistration':
    'kept: sign-out unregisters before the session ends (accountActions.beforeSignOut)',
  'src/lib/sessionEnds.ts#sessionEnds': 'kept: the registry',
  'src/lib/stickers/instance.ts#stickerStore': 'session',
  'src/lib/stickers/live.ts#settledStore': 'session',
  'src/lib/supabase/client.ts#client': 'kept: the Supabase client',
  'src/lib/supabase/sessionStorage.ts#sessionStorage': 'kept: Keychain session storage',
  'src/lib/uiVerifyPurchases.ts#bought': 'kept: verify-mode fixture',
  'src/lib/useLiveItems.ts#liveItems': 'kept: derived from the session stores that feed it',
  'src/lib/userCleanups.ts#userCleanups': 'kept: the registry',
  'src/ui/afterResign.ts#afterResign': 'kept: keyboard focus',
};

const ROOT = join(import.meta.dir, '..', '..');
const STATELESS_FACTORY = /^create(Context|Supabase|Fixture|Client$)/;
const CONSTANT = /^[A-Z0-9_]+$/;
const MUTABLE = new Set(['Map', 'Set', 'WeakMap', 'WeakSet']);

function* sources(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (relative(ROOT, path) !== join('src', 'debug')) yield* sources(path);
    } else if (/\.tsx?$/.test(name) && !/\.(test|integration|d)\.tsx?$/.test(name)) {
      yield path;
    }
  }
}

const parsed = new Map<string, ts.SourceFile>();
function parse(path: string) {
  let file = parsed.get(path);
  if (!file) {
    file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    parsed.set(path, file);
  }
  return file;
}

const keyOf = (path: string, name: string) => `${relative(ROOT, path)}#${name}`;

function isState(list: ts.VariableDeclarationList, declaration: ts.VariableDeclaration) {
  if (!ts.isIdentifier(declaration.name) || CONSTANT.test(declaration.name.text)) return false;
  if (!(list.flags & ts.NodeFlags.Const)) return true;
  const init = declaration.initializer;
  if (!init) return false;
  if (ts.isNewExpression(init)) return MUTABLE.has(init.expression.getText());
  return (
    ts.isCallExpression(init) &&
    ts.isIdentifier(init.expression) &&
    /^create/.test(init.expression.text) &&
    !STATELESS_FACTORY.test(init.expression.text)
  );
}

function moduleState() {
  const found = new Map<string, ts.VariableDeclaration>();
  for (const path of sources(join(ROOT, 'src'))) {
    for (const statement of parse(path).statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const list = statement.declarationList;
      for (const declaration of list.declarations) {
        if (isState(list, declaration))
          found.set(keyOf(path, declaration.name.getText()), declaration);
      }
    }
  }
  return found;
}

function resolveModule(from: string, specifier: string) {
  const base = specifier.startsWith('@/')
    ? join(ROOT, 'src', specifier.slice(2))
    : specifier.startsWith('.')
      ? join(dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function importedNames(file: ts.SourceFile) {
  const names = new Map<string, string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const target = resolveModule(file.fileName, statement.moduleSpecifier.text);
    if (!target) continue;
    for (const element of bindings.elements) {
      names.set(element.name.text, keyOf(target, (element.propertyName ?? element.name).text));
    }
  }
  return names;
}

function identifiersIn(node: ts.Node, into: Set<string>) {
  if (ts.isIdentifier(node)) into.add(node.text);
  node.forEachChild((child) => identifiersIn(child, into));
}

function helpers(file: ts.SourceFile) {
  const functions = new Map<string, ts.Node>();
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      functions.set(statement.name.text, statement);
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const { name, initializer } of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(name) &&
        initializer &&
        (ts.isArrayLiteralExpression(initializer) ||
          ts.isArrowFunction(initializer) ||
          ts.isFunctionExpression(initializer))
      ) {
        functions.set(name.text, initializer);
      }
    }
  }
  return functions;
}

function clearedBy(registry: string) {
  const cleared = new Set<string>();
  for (const path of sources(join(ROOT, 'src'))) {
    const file = parse(path);
    const imports = importedNames(file);
    const functions = helpers(file);
    const reach = (node: ts.Node, seen: Set<string>) => {
      const names = new Set<string>();
      identifiersIn(node, names);
      for (const name of names) {
        const helper = functions.get(name);
        if (helper && !seen.has(name)) {
          seen.add(name);
          reach(helper, seen);
        }
        cleared.add(imports.get(name) ?? keyOf(path, name));
      }
    };
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'register' &&
        node.expression.expression.getText() === registry
      ) {
        for (const argument of node.arguments) reach(argument, new Set());
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const init = node.initializer;
        if (init && ts.isCallExpression(init)) {
          const passed = new Set<string>();
          for (const argument of init.arguments) identifiersIn(argument, passed);
          if (passed.has(registry)) cleared.add(keyOf(path, node.name.text));
        }
      }
      node.forEachChild(visit);
    };
    visit(file);
  }
  return cleared;
}

describe('per-user state lifetimes', () => {
  const state = moduleState();

  test('every module-level store has a declared lifetime', () => {
    const undeclared = [...state.keys()].filter((key) => !(key in LIFETIMES));
    expect(undeclared).toEqual([]);
  });

  test('every declared lifetime still names a module-level store', () => {
    const stale = Object.keys(LIFETIMES).filter((key) => !state.has(key));
    expect(stale).toEqual([]);
  });

  test('every session store clears when the session ends', () => {
    const cleared = clearedBy('sessionEnds');
    const missed = Object.entries(LIFETIMES)
      .filter(([key, lifetime]) => lifetime === 'session' && !cleared.has(key))
      .map(([key]) => key);
    expect(missed).toEqual([]);
  });

  test('every account store clears when the account is deleted', () => {
    const cleared = clearedBy('userCleanups');
    const missed = Object.entries(LIFETIMES)
      .filter(([key, lifetime]) => lifetime === 'account' && !cleared.has(key))
      .map(([key]) => key);
    expect(missed).toEqual([]);
  });
});
