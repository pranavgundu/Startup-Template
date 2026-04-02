import { getPineconeIndex } from './client'

interface VectorRecord {
  id: string
  values: number[]
  metadata?: Record<string, string | number | boolean | string[]>
}

export async function upsertVectors(
  namespace: string,
  vectors: VectorRecord[]
) {
  const index = getPineconeIndex()
  return index.namespace(namespace).upsert({ records: vectors })
}

export async function queryVectors(
  namespace: string,
  vector: number[],
  topK = 10
) {
  const index = getPineconeIndex()
  return index.namespace(namespace).query({
    vector,
    topK,
    includeMetadata: true,
  })
}

export async function deleteVectors(namespace: string, ids: string[]) {
  const index = getPineconeIndex()
  return index.namespace(namespace).deleteMany(ids)
}
