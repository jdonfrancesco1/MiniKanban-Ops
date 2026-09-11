// Helper functions for mock Firebase implementations

// Create a mock timestamp
export function createMockTimestamp(date = new Date()) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  }
}

// Create a mock document snapshot
export function createMockDocSnapshot(id: string, data: any = {}) {
  return {
    id,
    exists: true,
    data: () => data,
    ref: {
      id,
      path: `mock/${id}`,
    },
  }
}

// Create a mock query snapshot
export function createMockQuerySnapshot(docs: any[] = []) {
  return {
    empty: docs.length === 0,
    docs: docs.map((doc) => createMockDocSnapshot(doc.id || "mock-id", doc)),
    forEach: (callback: (doc: any) => void) => {
      docs.forEach((doc) => callback(createMockDocSnapshot(doc.id || "mock-id", doc)))
    },
    size: docs.length,
  }
}

// Generate a random ID (similar to Firestore's auto-generated IDs)
export function generateMockId() {
  return "mock-" + Math.random().toString(36).substring(2, 15)
}

// Create a mock error that resembles Firebase errors
export function createMockFirebaseError(code: string, message: string) {
  return {
    code,
    message,
    name: "FirebaseError",
    stack: new Error().stack,
  }
}
