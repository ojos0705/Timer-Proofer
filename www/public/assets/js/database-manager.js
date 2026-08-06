// database-manager.js
import { Capacitor } from 'https://cdn.jsdelivr.net/npm/@capacitor/core@6.0.0/+esm';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.1/+esm';

// Inisialisasi Supabase Client di scope teratas
const SUPABASE_URL = 'https://rshnirlkjicnklrybjpf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaG5pcmxramljbmtscnlianBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjM0NjAsImV4cCI6MjA5OTY5OTQ2MH0.v5FXEfIQ1hLDLQmWgS9tv0f6OD2VqMdgius_cRjV9FI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };

class DatabaseManager {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.db = null;
  }

  async init() {
    if (this.isNative) {
      this.db = await this.initSQLite();
    } else {
      this.db = await this.initIndexedDB();
    }
    this.setupSyncListeners();
  }

  // --- IMPLEMENTASI INDEXEDDB (WEB / PWA) ---
  async initIndexedDB() {
    const db = new Dexie('TimerProoferDB');
    // Menambahkan store 'ingredients' agar bahan baku bisa disimpan lokal lewat Dexie
    db.version(1).stores({
      recipes: 'id, name, ingredients, last_modified, is_synced',
      ingredients: 'id, name, type, category, ratio, price, pack, isFlour',
      sync_outbox: 'id, table_name, action, payload, timestamp'
    });
    await db.open();
    return {
      type: 'indexeddb',
      instance: db,
      saveRecipe: async (recipe) => {
        recipe.is_synced = 0;
        recipe.last_modified = new Date().toISOString();
        await db.recipes.put(recipe);
        await this.addToOutbox('recipes', 'INSERT_UPDATE', recipe);
      },
      getRecipes: async () => {
        return await db.recipes.toArray();
      },
      markAsSynced: async (id) => {
        await db.recipes.update(id, { is_synced: 1 });
      }
    };
  }

  // --- IMPLEMENTASI SQLITE (CAPACITOR MOBILE) ---
  async initSQLite() {
    const { CapacitorSQLite, SQLiteConnection } = window.Capacitor.Plugins;
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const dbConnection = await sqlite.createConnection('timer_proofer', false, 'no-encryption', 1, false);
    await dbConnection.open();

    const schema = `
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT,
        ingredients TEXT,
        last_modified TEXT,
        is_synced INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        category TEXT,
        ratio REAL,
        price REAL,
        pack REAL,
        isFlour INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        table_name TEXT,
        action TEXT,
        payload TEXT,
        timestamp TEXT
      );
    `;
    await dbConnection.execute(schema);

    return {
      type: 'sqlite',
      instance: dbConnection,
      saveRecipe: async (recipe) => {
        recipe.is_synced = 0;
        recipe.last_modified = new Date().toISOString();
        
        const q = `INSERT OR REPLACE INTO recipes (id, name, ingredients, last_modified, is_synced) VALUES (?, ?, ?, ?, ?)`;
        const values = [recipe.id, recipe.name, JSON.stringify(recipe.ingredients), recipe.last_modified, 0];
        await dbConnection.run(q, values);
        await this.addToOutbox('recipes', 'INSERT_UPDATE', recipe);
      },
      getRecipes: async () => {
        const res = await dbConnection.query('SELECT * FROM recipes');
        return res.values.map(row => ({
          ...row,
          ingredients: JSON.parse(row.ingredients)
        }));
      },
      markAsSynced: async (id) => {
        await dbConnection.run(`UPDATE recipes SET is_synced = 1 WHERE id = ?`, [id]);
      }
    };
  }

  // --- TAMBAHAN BARU: FUNGSI AMBIL SEMUA BAHAN ---
  async getAllIngredients() {
    if (!this.db) {
      console.warn("Database belum siap, mengambil dari window.bakeryIngredients");
      return window.bakeryIngredients || [];
    }

    try {
      if (this.isNative) {
        // Mengambil data bahan dari SQLite jika di App Mobile
        const res = await this.db.instance.query('SELECT * FROM ingredients');
        if (!res.values || res.values.length === 0) {
          return window.bakeryIngredients || [];
        }
        return res.values.map(row => ({
          ...row,
          isFlour: row.isFlour === 1 // Konversi integer SQLite ke boolean JS
        }));
      } else {
        // Mengambil data bahan dari Dexie jika di Web Browser
        const localIngredients = await this.db.instance.ingredients.toArray();
        if (!localIngredients || localIngredients.length === 0) {
          return window.bakeryIngredients || [];
        }
        return localIngredients;
      }
    } catch (err) {
      console.error("Gagal mengambil data bahan baku, dialihkan ke data lokal:", err);
      return window.bakeryIngredients || [];
    }
  }

  // --- PENGELOLAAN ANTRIAN OFFLINE (OUTBOX) ---
  async addToOutbox(tableName, action, data) {
    const outboxItem = {
      id: crypto.randomUUID(),
      table_name: tableName,
      action: action,
      payload: data,
      timestamp: new Date().toISOString()
    };

    if (this.isNative) {
      const q = `INSERT INTO sync_outbox (id, table_name, action, payload, timestamp) VALUES (?, ?, ?, ?, ?)`;
      await this.db.instance.run(q, [outboxItem.id, outboxItem.table_name, outboxItem.action, JSON.stringify(outboxItem.payload), outboxItem.timestamp]);
    } else {
      await this.db.instance.sync_outbox.put(outboxItem);
    }

    if (navigator.onLine) {
      this.syncWithSupabase();
    }
  }

  // --- SINKRONISASI & EVENT LISTENERS ---
  setupSyncListeners() {
    window.addEventListener('online', () => {
      console.log('Koneksi internet terdeteksi. Memulai sinkronisasi...');
      this.syncWithSupabase();
    });
  }

  async syncWithSupabase() {
    if (!navigator.onLine) return;

    let outboxItems = [];

    if (this.isNative) {
      const res = await this.db.instance.query('SELECT * FROM sync_outbox ORDER BY timestamp ASC');
      outboxItems = res.values.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
    } else {
      outboxItems = await this.db.instance.sync_outbox.orderBy('timestamp').toArray();
    }

    if (outboxItems.length === 0) return;

    console.log(`Mengirim ${outboxItems.length} perubahan ke Supabase...`);

    for (const item of outboxItems) {
      try {
        if (item.action === 'INSERT_UPDATE') {
          const { error } = await supabase
            .from(item.table_name)
            .upsert({
              id: item.payload.id,
              name: item.payload.name,
              ingredients: item.payload.ingredients,
              last_modified: item.payload.last_modified
            });

          if (error) throw error;
        }

        await this.db.markAsSynced(item.payload.id);

        if (this.isNative) {
          await this.db.instance.run('DELETE FROM sync_outbox WHERE id = ?', [item.id]);
        } else {
          await this.db.instance.sync_outbox.delete(item.id);
        }

      } catch (err) {
        console.error('Sinkronisasi gagal untuk item:', item.id, err);
        break; 
      }
    }
  }

  // --- PULL DATA TERBARU DARI SUPABASE ---
  async pullFromSupabase() {
    if (!navigator.onLine) return;

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*');

      if (error) throw error;

      for (const item of data) {
        if (this.isNative) {
          await this.db.instance.run(
            `INSERT OR REPLACE INTO recipes (id, name, ingredients, last_modified, is_synced) VALUES (?, ?, ?, ?, 1)`,
            [item.id, item.name, JSON.stringify(item.ingredients), item.last_modified]
          );
        } else {
          await this.db.instance.recipes.put({
            ...item,
            is_synced: 1
          });
        }
      }
    } catch (err) {
      console.error('Gagal menarik data terbaru dari cloud:', err);
    }
  }
}

export const dbManager = new DatabaseManager();