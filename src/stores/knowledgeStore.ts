import { create } from "zustand";

export interface KnowledgeBaseState {
  selectedKnowledgeBaseId: string | null;
  selectedDocumentId: string | null;
  isUploading: boolean;
  uploadProgress: number;
  indexingDocumentIds: Set<string>;
}

interface KnowledgeStoreActions {
  setSelectedKnowledgeBase: (id: string | null) => void;
  setSelectedDocument: (id: string | null) => void;
  setUploading: (isUploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  addIndexingDocument: (id: string) => void;
  removeIndexingDocument: (id: string) => void;
  reset: () => void;
}

const initialState: KnowledgeBaseState = {
  selectedKnowledgeBaseId: null,
  selectedDocumentId: null,
  isUploading: false,
  uploadProgress: 0,
  indexingDocumentIds: new Set(),
};

export const useKnowledgeStore = create<KnowledgeBaseState & KnowledgeStoreActions>(
  (set) => ({
    ...initialState,

    setSelectedKnowledgeBase: (id) =>
      set({ selectedKnowledgeBaseId: id, selectedDocumentId: null }),

    setSelectedDocument: (id) => set({ selectedDocumentId: id }),

    setUploading: (isUploading) => set({ isUploading }),

    setUploadProgress: (progress) => set({ uploadProgress: progress }),

    addIndexingDocument: (id) =>
      set((state) => ({
        indexingDocumentIds: new Set([...state.indexingDocumentIds, id]),
      })),

    removeIndexingDocument: (id) =>
      set((state) => {
        const newSet = new Set(state.indexingDocumentIds);
        newSet.delete(id);
        return { indexingDocumentIds: newSet };
      }),

    reset: () => set(initialState),
  })
);
