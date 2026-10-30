import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

type Node = { id: string; name: string; parentId: string | null; children: Node[] };

describe("warehouse tree", () => {
  let t: TestApp;
  let cookie: string;

  beforeAll(async () => {
    t = await startTestApp();
    cookie = await t.loginAsOwner();
  });
  afterAll(() => t.stop());

  const create = (payload: object) => t.app.inject({ method: "POST", url: "/api/warehouses", headers: { cookie }, payload });
  const createId = async (name: string, parentId?: string) => (await create({ name, parentId })).json<{ id: string }>().id;
  const tree = async () => (await t.app.inject({ method: "GET", url: "/api/warehouses", headers: { cookie } })).json<Node[]>();
  const remove = (id: string) => t.app.inject({ method: "DELETE", url: `/api/warehouses/${id}`, headers: { cookie } });
  const rename = (id: string, payload: object) =>
    t.app.inject({ method: "PATCH", url: `/api/warehouses/${id}`, headers: { cookie }, payload });
  const flatten = (nodes: Node[]): Node[] => nodes.flatMap((n) => [n, ...flatten(n.children)]);

  it("creates a root warehouse", async () => {
    const res = await create({ name: "Asosiy ombor" });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ name: "Asosiy ombor", parentId: null });
  });

  it("creates nested warehouses to depth 3 and returns them as a tree", async () => {
    const main = await createId("Filial");
    const fridge = await createId("Muzlatgich", main);
    const shelf = await createId("Yuqori javon", fridge);
    await createId("B javon", main);

    const branch = (await tree()).find((n) => n.id === main)!;
    expect(branch.parentId).toBeNull();
    expect(branch.children.map((c) => c.name).sort()).toEqual(["B javon", "Muzlatgich"]);
    const nestedFridge = branch.children.find((c) => c.id === fridge)!;
    expect(nestedFridge.parentId).toBe(main);
    expect(nestedFridge.children).toMatchObject([{ id: shelf, name: "Yuqori javon", parentId: fridge, children: [] }]);
    expect(flatten(await tree()).find((n) => n.name === "Yuqori javon")?.id).toBe(shelf);
  });

  it("refuses a parent that does not exist", async () => {
    expect((await create({ name: "Yetim", parentId: "64b7f0f0f0f0f0f0f0f0f0f0" })).statusCode).toBe(404);
    expect((await create({ name: "Yetim", parentId: "not-an-id" })).statusCode).toBe(404);
    expect((await create({ name: "Yetim", parentId: "" })).statusCode).toBe(400);
  });

  it("rejects a blank name", async () => {
    expect((await create({ name: "  " })).statusCode).toBe(400);
    expect((await create({})).statusCode).toBe(400);
  });

  it("renames a node without moving it", async () => {
    const root = await createId("Eski ombor");
    const child = await createId("Orqa xona", root);

    const res = await rename(child, { name: "Orqa xona 2" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: child, name: "Orqa xona 2", parentId: root });

    const moved = await rename(child, { name: "Orqa xona 3", parentId: null });
    expect(moved.statusCode).toBe(400);

    const parent = (await tree()).find((n) => n.id === root)!;
    expect(parent.children.map((c) => c.name)).toEqual(["Orqa xona 2"]);
    expect((await rename("64b7f0f0f0f0f0f0f0f0f0f0", { name: "X" })).statusCode).toBe(404);
    expect((await rename(child, { name: "" })).statusCode).toBe(400);
  });

  it("deletes a leaf but refuses a node that has children", async () => {
    const root = await createId("Vaqtinchalik");
    const leaf = await createId("Bo'sh javon", root);

    const refused = await remove(root);
    expect(refused.statusCode).toBe(400);
    expect(refused.json().message).toMatch(/sub-warehouses/);
    expect(await tree()).toContainEqual(expect.objectContaining({ id: root }));

    expect((await remove(leaf)).statusCode).toBe(204);
    expect((await remove(root)).statusCode).toBe(204);
    expect((await tree()).some((n) => n.id === root)).toBe(false);
    expect((await remove(root)).statusCode).toBe(404);
  });

  it("requires a session", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/warehouses" });
    expect(res.statusCode).toBe(401);
  });
});
