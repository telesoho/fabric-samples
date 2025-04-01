import { newDb } from 'pg-mem';
import { PostgreSQLWalletStore } from './postgresql_wallet_store';
import { Buffer } from 'buffer';

describe('PostgreSQLWalletStore', () => {
  let store: PostgreSQLWalletStore;
  const TEST_LABEL = 'test_label';
  const TEST_DATA = Buffer.from('test_data');

  beforeAll(async () => {
    const db = newDb().adapters.createPgPromise();
      
    // 绕过CREATE DATABASE检查（pg-mem不需要实际数据库）
    // @ts-ignore 绕过私有构造函数
    PostgreSQLWalletStore.createTables(db);
    // @ts-ignore 绕过私有构造函数
    store = new PostgreSQLWalletStore(db);
  });

  beforeEach(async () => {
    await store.remove(TEST_LABEL); // 清理测试数据
  });

  describe('CRUD operations', () => {
    it('should store and retrieve data', async () => {
      await store.put(TEST_LABEL, TEST_DATA);
      const result = await store.get(TEST_LABEL);
      const hexString = result?.toString().replace(/^\\x/, '');
      expect(Buffer.from(hexString!, 'hex').toString()).toEqual(TEST_DATA.toString());
    });

    it('should return undefined for non-existent label', async () => {
      const result = await store.get('non_existent');
      expect(result).toBeUndefined();
    });

    it('should list all labels', async () => {
      await store.put('label1', TEST_DATA);
      await store.put('label2', TEST_DATA);
      const labels = await store.list();
      expect(labels).toEqual(expect.arrayContaining(['label1', 'label2']));
    });

    it('should update existing entry', async () => {
      const newData = Buffer.from('new_data');
      await store.put(TEST_LABEL, TEST_DATA);
      await store.put(TEST_LABEL, newData);
      const result = await store.get(TEST_LABEL);
      const hexString = result?.toString().replace(/^\\x/, '');
      expect(Buffer.from(hexString!, 'hex').toString()).toEqual(newData.toString());
    });

    it('should remove entry', async () => {
      await store.put(TEST_LABEL, TEST_DATA);
      await store.remove(TEST_LABEL);
      const result = await store.get(TEST_LABEL);
      expect(result).toBeUndefined();
    });
  });
});