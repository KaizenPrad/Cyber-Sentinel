# CyberSentinel — STP Framework

## Segmentation

CyberSentinel segments the cybersecurity market based on organization size, security maturity, and threat monitoring requirements.

| Segment | Characteristics | Security Needs |
|----------|----------------|----------------|
| Small Businesses | Limited IT/Security staff | Basic monitoring and alerts |
| SMEs | Multiple users and devices | Centralized threat detection |
| Large Enterprises | Dedicated SOC teams | Advanced analytics and incident response |
| Educational Institutions | Large user base | Phishing and unauthorized-access detection |
| Financial / Regulated Organizations | Sensitive data | Continuous monitoring and compliance |
| Security Teams / SOC Analysts | High alert volume | Alert correlation and investigation |

### Functional Segmentation

CyberSentinel monitors:

- Network behaviour
- User behaviour
- Device behaviour
- Authentication activity
- Phishing indicators
- Malware indicators
- Ransomware indicators
- Unauthorized access
- Cross-signal correlations

---

## Targeting

### Primary Target

**Small and Medium Enterprises (SMEs)** and organizations with limited security teams.

These organizations:

- Have multiple users and devices
- Generate many security events
- Lack dedicated analysts
- Need automated threat detection

### Secondary Target

- Security Analysts
- SOC Teams
- IT Administrators

### Example

Instead of investigating separate events:

```text
Unusual Login
New Device
Large File Download
Suspicious Domain
```

CyberSentinel correlates them:

```text
Network Signals ─┐
User Signals ────┼──→ Correlation Engine
Device Signals ──┘          ↓
                     AI Detection
                          ↓
                    Threat Score
                          ↓
                       Incident
```

---

## Positioning

### Positioning Statement

> CyberSentinel is an AI-powered cybersecurity platform that correlates network, user, and device behaviour to detect suspicious activities, identify emerging threats, and convert scattered security signals into actionable incidents.

### Unique Positioning

Traditional security systems rely on individual signatures:

```text
Event
   ↓
Signature Match
   ↓
Alert
```

CyberSentinel uses behavioural intelligence:

```text
Network Activity ─┐
User Activity ────┼──→ Multi-Signal Correlation
Device Activity ──┘            ↓
                          AI Analysis
                               ↓
                         Threat Scoring
                               ↓
                           Incident
```

### Positioning Matrix

| Traditional Security Tools | CyberSentinel |
|----------------------------|---------------|
| Signature-Based Detection | Behaviour-Based Detection |
| Isolated Alerts | Correlated Incidents |
| Manual Investigation | AI-Assisted Investigation |
| Fixed Rules | Adaptive Intelligence |
| Event Monitoring | Contextual Threat Analysis |

### Example Scenario

A user:

1. Logs in from an unusual location.
2. Uses an unknown device.
3. Downloads sensitive files.
4. Connects to a suspicious domain.

Traditional systems generate multiple alerts:

```text
Alert 1
Alert 2
Alert 3
Alert 4
```

CyberSentinel creates:

```text
Multiple Signals
        ↓
Correlation Engine
        ↓
Threat Score: High
        ↓
Unauthorized Access Incident
```

---

## STP Summary

| Component | CyberSentinel Strategy |
|------------|-----------------------|
| Segmentation | Businesses, enterprises, institutions, and security teams |
| Targeting | SMEs, SOC teams, IT administrators |
| Positioning | AI-driven behavioural threat detection platform |

### Core Value Proposition

> CyberSentinel transforms scattered security signals into correlated, explainable, and actionable security incidents.