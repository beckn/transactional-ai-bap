# State Machine for an Agentic Workflow
Below is the state machine of an agentic workflow on a BAP

```mermaid
stateDiagram-v2
    [*] --> AgentOrchestrator
    
    AgentOrchestrator --> DiscoveryAgent
    AgentOrchestrator --> PriceNegotiationAgent
    AgentOrchestrator --> TermsNegotiationAgent
    AgentOrchestrator --> FulfillmentAgent
    AgentOrchestrator --> SupportAgent
    AgentOrchestrator --> ConfirmationAgent
    AgentOrchestrator --> TrackingAgent
    AgentOrchestrator --> CancellationAgent
    AgentOrchestrator --> ModificationAgent
    AgentOrchestrator --> RatingAgent
    
    DiscoveryAgent --> PriceNegotiationAgent
    DiscoveryAgent --> TermsNegotiationAgent
    PriceNegotiationAgent --> ConfirmationAgent
    TermsNegotiationAgent --> ConfirmationAgent
    ConfirmationAgent --> FulfillmentAgent
    
    FulfillmentAgent --> TrackingAgent
    FulfillmentAgent --> CancellationAgent
    FulfillmentAgent --> ModificationAgent
    
    CancellationAgent --> FulfillmentAgent
    CancellationAgent --> SupportAgent
    
    ModificationAgent --> FulfillmentAgent
    
    TrackingAgent --> SupportAgent
    SupportAgent --> Tool : T
    RatingAgent --> SupportAgent
    
    PriceNegotiationAgent --> DiscoveryAgent : Continue browsing after price negotiation
    TermsNegotiationAgent --> DiscoveryAgent : Return to browsing due to undesirable terms
    TermsNegotiationAgent --> PriceNegotiationAgent : Adjust price based on terms
    PriceNegotiationAgent --> TermsNegotiationAgent : Adjust terms based on pricing
    ConfirmationAgent --> TermsNegotiationAgent : Revisit terms before confirming
    
    FulfillmentAgent --> ModificationAgent : Update fulfillment based on modifications
    FulfillmentAgent --> TrackingAgent : Reverse connection to update fulfillment
    SupportAgent --> DiscoveryAgent : Assist in rediscovering services
    SupportAgent --> PriceNegotiationAgent : Assist in pricing-related issues
    SupportAgent --> TermsNegotiationAgent : Assist in terms-related issues
    CancellationAgent --> TermsNegotiationAgent : Renegotiate terms before cancellation
    RatingAgent --> FulfillmentAgent : Feedback for fulfillment process

    DiscoveryAgent --> Tool : T
    PriceNegotiationAgent --> Tool : T
    TermsNegotiationAgent --> Tool : T
    ConfirmationAgent --> Tool : T
    FulfillmentAgent --> Tool : T
    CancellationAgent --> Tool : T
    ModificationAgent --> Tool : T
    TrackingAgent --> Tool : T
    RatingAgent --> Tool : T
