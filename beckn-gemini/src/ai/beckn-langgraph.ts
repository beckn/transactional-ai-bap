import { LLMFactory } from "../ai/llm/factory";
import { LLMProvider } from "./llm/types";
import { GraphContext } from "./types";

interface Node {
  id: string;
  type: string;
  next?: string[];
}

interface Edge {
  from: string;
  to: string;
  condition?: (context: GraphContext) => boolean;
}

export class BecknLangGraph {
  private nodes: Map<string, Node>;
  private edges: Edge[];
  private llm: LLMProvider;
  private context: Map<string, any>;

  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.llm = LLMFactory.getProvider();
    this.context = new Map();
  }

  addNode(node: Node) {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: Edge) {
    this.edges.push(edge);
  }

  setContext(key: string, value: any) {
    this.context.set(key, value);
  }

  getContext(key: string) {
    return this.context.get(key);
  }

  private mapToGraphContext(contextMap: Map<string, any>): GraphContext {
    const obj = Object.fromEntries(contextMap);
    // Ensure required properties exist
    if (!obj.whatsappNumber || !obj.userMessage) {
      throw new Error('Required context properties missing: whatsappNumber and userMessage must be set');
    }
    return obj as GraphContext;
  }

  async executeNode(nodeId: string): Promise<string | null> {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    // Execute node logic based on type
    switch (node.type) {
      case 'llm':
        const response = await this.llm.generateResponse({
          prompt: this.context.get('currentPrompt'),
          systemPrompt: this.context.get('systemPrompt')
        });
        this.context.set('llmResponse', response.text);
        break;
      
      case 'action':
        // Execute custom action
        const action = this.context.get('action');
        if (action && typeof action === 'function') {
          await action(this.mapToGraphContext(this.context));
        }
        break;
    }

    // Find next node
    const nextEdges = this.edges.filter(edge => edge.from === nodeId);
    for (const edge of nextEdges) {
      if (!edge.condition || edge.condition(this.mapToGraphContext(this.context))) {
        return edge.to;
      }
    }

    return null;
  }

  async execute(startNodeId: string) {
    let currentNodeId: string | null = startNodeId;
    
    while (currentNodeId !== null) {
      currentNodeId = await this.executeNode(currentNodeId);
    }

    return this.mapToGraphContext(this.context);
  }
} 