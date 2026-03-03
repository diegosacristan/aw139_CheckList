const DB_NAME = "safety_pwa_db";
const DB_VERSION = 1;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function openDB() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;

    if (!db.objectStoreNames.contains("flights")) {
      const flights = db.createObjectStore("flights", { keyPath: "id" });
      flights.createIndex("dateISO", "dateISO", { unique: false });
    }

    if (!db.objectStoreNames.contains("briefings")) {
      const briefings = db.createObjectStore("briefings", { keyPath: "id" });
      briefings.createIndex("flightId", "flightId", { unique: false });
      briefings.createIndex("byFlightLegType", ["flightId", "legId", "type"], { unique: true });
    }

    if (!db.objectStoreNames.contains("tem_logs")) {
      const temLogs = db.createObjectStore("tem_logs", { keyPath: "id" });
      temLogs.createIndex("flightId", "flightId", { unique: false });
      temLogs.createIndex("byFlightLeg", ["flightId", "legId"], { unique: false });
    }

    if (!db.objectStoreNames.contains("debriefs")) {
      const debriefs = db.createObjectStore("debriefs", { keyPath: "id" });
      debriefs.createIndex("flightId", "flightId", { unique: false });
      debriefs.createIndex("byFlightLeg", ["flightId", "legId"], { unique: true });
    }
  };

  return requestToPromise(request);
}

async function withStore(db, storeName, mode, handler) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let output;

    try {
      output = handler(store);
    } catch (error) {
      reject(error);
      return;
    }

    tx.oncomplete = async () => {
      try {
        if (output && typeof output.then === "function") {
          resolve(await output);
        } else {
          resolve(output);
        }
      } catch (error) {
        reject(error);
      }
    };

    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
}

async function put(db, storeName, value) {
  return withStore(db, storeName, "readwrite", (store) => store.put(value));
}

async function get(db, storeName, key) {
  return withStore(db, storeName, "readonly", (store) => requestToPromise(store.get(key)));
}

async function del(db, storeName, key) {
  return withStore(db, storeName, "readwrite", (store) => store.delete(key));
}

async function getAll(db, storeName) {
  return withStore(db, storeName, "readonly", (store) => requestToPromise(store.getAll()));
}

async function getAllByIndex(db, storeName, indexName, query) {
  return withStore(db, storeName, "readonly", (store) => {
    const index = store.index(indexName);
    return requestToPromise(index.getAll(query));
  });
}

async function getByIndex(db, storeName, indexName, query) {
  return withStore(db, storeName, "readonly", (store) => {
    const index = store.index(indexName);
    return requestToPromise(index.get(query));
  });
}

window.SAFETY_DB = {
  DB_NAME,
  DB_VERSION,
  openDB,
  put,
  get,
  del,
  getAll,
  getAllByIndex,
  getByIndex
};

