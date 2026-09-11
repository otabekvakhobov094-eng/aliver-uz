import { BadRequestException } from '@nestjs/common';

/**
 * Kategoriya ierarxiyasi.
 *
 * TZ 10-bo'lim "cheksiz ierarxiya" deydi, lekin ekspertiza B-7 bandida
 * bu cheklangan: URL, breadcrumb, filtr va SEO cheksiz chuqurlikda
 * boshqarib bo'lmas holga keladi. Maksimal 3 daraja (0, 1, 2).
 *
 * Chuqur so'rovlarni tezlashtirish uchun materialized path saqlanadi:
 * "rootId/childId/grandChildId".
 */
export const MAX_CATEGORY_DEPTH = 3;

export interface CategoryNodeInput {
  id: string;
  parentId: string | null;
  slug: string;
  nameUz: string;
  nameRu: string;
  sortOrder: number;
  isActive: boolean;
  depth?: number;
  path?: string | null;
  productCount?: number;
}

export interface CategoryNode extends CategoryNodeInput {
  depth: number;
  path: string;
  children: CategoryNode[];
}

export function buildPath(parentPath: string | null | undefined, id: string): string {
  return parentPath ? `${parentPath}/${id}` : id;
}

export function depthFromPath(path: string): number {
  return path.split('/').length - 1;
}

/** Ota kategoriya chuqurligiga qarab yangi darajani tekshiradi. */
export function assertDepthAllowed(parentDepth: number | null): number {
  const depth = parentDepth === null ? 0 : parentDepth + 1;
  if (depth >= MAX_CATEGORY_DEPTH) {
    throw new BadRequestException(
      `Kategoriya ierarxiyasi ${MAX_CATEGORY_DEPTH} darajadan chuqur bo‘lishi mumkin emas`,
    );
  }
  return depth;
}

/**
 * Kategoriyani boshqa otaga ko'chirishda halqa hosil bo'lmasligini tekshiradi:
 * kategoriyani o'z avlodiga ko'chirib bo'lmaydi.
 */
export function assertNoCycle(movingId: string, newParentPath: string | null): void {
  if (!newParentPath) return;
  if (newParentPath.split('/').includes(movingId)) {
    throw new BadRequestException('Kategoriyani o‘z ichidagi kategoriyaga ko‘chirib bo‘lmaydi');
  }
}

/** Tekis ro'yxatdan daraxt yig'adi. Bolalar sortOrder, so'ng nom bo'yicha. */
export function buildTree(nodes: CategoryNodeInput[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const n of nodes) {
    map.set(n.id, { ...n, depth: n.depth ?? 0, path: n.path ?? n.id, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (list: CategoryNode[]): void => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.nameUz.localeCompare(b.nameUz, 'uz'));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** Kategoriya va uning barcha avlodlari id lari — filtrda ishlatiladi. */
export function collectDescendantIds(tree: CategoryNode[], rootId: string): string[] {
  const found: string[] = [];
  const walk = (nodes: CategoryNode[], inside: boolean): void => {
    for (const n of nodes) {
      const hit = inside || n.id === rootId;
      if (hit) found.push(n.id);
      walk(n.children, hit);
    }
  };
  walk(tree, false);
  return found;
}

/** Breadcrumb: ildizdan joriy kategoriyagacha. */
export function breadcrumbFromPath(
  path: string,
  byId: Map<string, { id: string; slug: string; nameUz: string; nameRu: string }>,
): Array<{ id: string; slug: string; nameUz: string; nameRu: string }> {
  return path
    .split('/')
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}
