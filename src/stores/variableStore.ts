import { create } from "zustand";
import type { 
  GlobalVariable, 
  NodeOutputVariable, 
  EdgeMapping,
  VariableType 
} from "@/components/builder/variables/variableTypes";

interface VariableState {
  // Global variables
  globalVariables: GlobalVariable[];
  
  // Node outputs (auto-generated from nodes)
  nodeOutputs: Record<string, NodeOutputVariable[]>;
  
  // Edge mappings
  edgeMappings: Record<string, EdgeMapping>;
  
  // Selected edge for mapping panel
  selectedEdgeId: string | null;
  
  // Mock data for preview
  mockData: Record<string, unknown>;
}

interface VariableActions {
  // Global variable actions
  addGlobalVariable: (variable: GlobalVariable) => void;
  updateGlobalVariable: (id: string, updates: Partial<GlobalVariable>) => void;
  removeGlobalVariable: (id: string) => void;
  
  // Node output actions
  updateNodeOutputs: (nodeId: string, outputs: NodeOutputVariable[]) => void;
  removeNodeOutputs: (nodeId: string) => void;
  
  // Edge mapping actions
  setEdgeMapping: (edgeId: string, mapping: EdgeMapping) => void;
  removeEdgeMapping: (edgeId: string) => void;
  
  // Selection
  setSelectedEdgeId: (edgeId: string | null) => void;
  
  // Mock data
  setMockData: (nodeId: string, data: unknown) => void;

  // Resolve variable references in a string
  resolveVariables: (template: string, context: Record<string, Record<string, unknown>>) => string;
  
  // Register node schema
  registerNodeSchema: (nodeId: string, schema: Record<string, VariableType>) => void;
  
  // Node schemas registry
  nodeSchemas: Record<string, Record<string, VariableType>>;
  
  // Get all variables for autocomplete
  getAllVariables: () => Array<{
    id: string;
    name: string;
    path: string;
    type: VariableType;
    scope: "global" | "node";
  }>;
  
  // Reset
  reset: () => void;
}

const initialState: VariableState & { nodeSchemas: Record<string, Record<string, VariableType>> } = {
  globalVariables: [
    {
      id: "global-user-id",
      name: "user_id",
      type: "string",
      scope: "global",
      value: "usr_12345",
      description: "当前用户的唯一标识符",
      isSecret: false,
    },
    {
      id: "global-session-id",
      name: "session_id",
      type: "string",
      scope: "global",
      value: "sess_67890",
      description: "当前会话ID",
      isSecret: false,
    },
  ],
  nodeOutputs: {},
  edgeMappings: {},
  selectedEdgeId: null,
  mockData: {},
  nodeSchemas: {},
};

export const useVariableStore = create<VariableState & VariableActions>(
  (set, get) => ({
    ...initialState,

    addGlobalVariable: (variable) =>
      set((state) => ({
        globalVariables: [...state.globalVariables, variable],
      })),

    updateGlobalVariable: (id, updates) =>
      set((state) => ({
        globalVariables: state.globalVariables.map((v) =>
          v.id === id ? { ...v, ...updates } : v
        ),
      })),

    removeGlobalVariable: (id) =>
      set((state) => ({
        globalVariables: state.globalVariables.filter((v) => v.id !== id),
      })),

    updateNodeOutputs: (nodeId, outputs) =>
      set((state) => ({
        nodeOutputs: {
          ...state.nodeOutputs,
          [nodeId]: outputs,
        },
      })),

    removeNodeOutputs: (nodeId) =>
      set((state) => {
        const newOutputs = { ...state.nodeOutputs };
        delete newOutputs[nodeId];
        return { nodeOutputs: newOutputs };
      }),

    setEdgeMapping: (edgeId, mapping) =>
      set((state) => ({
        edgeMappings: {
          ...state.edgeMappings,
          [edgeId]: mapping,
        },
      })),

    removeEdgeMapping: (edgeId) =>
      set((state) => {
        const newMappings = { ...state.edgeMappings };
        delete newMappings[edgeId];
        return { edgeMappings: newMappings };
      }),

    setSelectedEdgeId: (edgeId) => set({ selectedEdgeId: edgeId }),

    setMockData: (nodeId, data) =>
      set((state) => ({
        mockData: {
          ...state.mockData,
          [nodeId]: data,
        },
      })),

    getAllVariables: () => {
      const state = get();
      const variables: Array<{
        id: string;
        name: string;
        path: string;
        type: VariableType;
        scope: "global" | "node";
      }> = [];

      // Add global variables
      state.globalVariables.forEach((v) => {
        variables.push({
          id: v.id,
          name: v.name,
          path: `global.${v.name}`,
          type: v.type,
          scope: "global",
        });
      });

      // Add node output variables
      Object.entries(state.nodeOutputs).forEach(([nodeId, outputs]) => {
        outputs.forEach((output) => {
          variables.push({
            id: output.id,
            name: output.name,
            path: `${nodeId}.${output.path || output.name}`,
            type: output.type,
            scope: "node",
          });
        });
      });

      return variables;
    },

    resolveVariables: (template, context) => {
      return template.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
        const parts = expr.trim().split(".");
        if (parts.length < 2) return match;
        const [nodeId, ...pathParts] = parts;
        const nodeData = context[nodeId];
        if (!nodeData) return match;
        let current: unknown = nodeData;
        for (const key of pathParts) {
          if (current === null || current === undefined || typeof current !== "object") return match;
          current = (current as Record<string, unknown>)[key];
        }
        return current !== undefined && current !== null ? String(current) : match;
      });
    },

    registerNodeSchema: (nodeId, schema) =>
      set((state) => ({
        nodeSchemas: { ...state.nodeSchemas, [nodeId]: schema },
      })),

    reset: () => set(initialState),
  })
);
