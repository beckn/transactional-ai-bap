# State Machine for an Agentic Workflow
Below is the state machine of an agentic workflow on a BAP

```mermaid
stateDiagram-v2
    direction TB
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

    PriceNegotiationAgent --> DiscoveryAgent
    TermsNegotiationAgent --> DiscoveryAgent
    TermsNegotiationAgent --> PriceNegotiationAgent
    PriceNegotiationAgent --> TermsNegotiationAgent
    ConfirmationAgent --> TermsNegotiationAgent

    FulfillmentAgent --> ModificationAgent
    FulfillmentAgent --> TrackingAgent
    SupportAgent --> DiscoveryAgent
    SupportAgent --> PriceNegotiationAgent
    SupportAgent --> TermsNegotiationAgent
    CancellationAgent --> TermsNegotiationAgent
    RatingAgent --> FulfillmentAgent

    DiscoveryAgent --> Tool : T
    PriceNegotiationAgent --> Tool : T
    TermsNegotiationAgent --> Tool : T
    ConfirmationAgent --> Tool : T
    FulfillmentAgent --> Tool : T
    CancellationAgent --> Tool : T
    ModificationAgent --> Tool : T
    TrackingAgent --> Tool : T
    RatingAgent --> Tool : T

    style AgentOrchestrator fill:#f9c702
    style DiscoveryAgent fill:#f7b7a3
    style PriceNegotiationAgent fill:#d0f0c0
    style TermsNegotiationAgent fill:#b0e0e6
    style FulfillmentAgent fill:#ffcccb
    style SupportAgent fill:#dda0dd
    style ConfirmationAgent fill:#ffb6c1
    style TrackingAgent fill:#add8e6
    style CancellationAgent fill:#ffdab9
    style ModificationAgent fill:#87ceeb
    style RatingAgent fill:#afeeee
    style Tool fill:#f0e68c

