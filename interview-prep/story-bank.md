# Interview Story Bank

Reusable STAR+R stories. Each can be adapted to different interview questions.

---

## Story 001 — PyPI Package Delivery (Production ML Library)

**Source:** Anote AI MLE Intern
**Best for:** HF-type roles, library building, production ML, "tell me about shipping something real"

| | |
|---|---|
| **S** | Team needed a production-grade synthetic data engine usable by external teams |
| **T** | Ship a multimodal synthetic data generator as a PyPI package |
| **A** | Designed public API surface; integrated OpenAI + YOLO; handled versioning and packaging |
| **R** | Package deployed and used in production |
| **Reflection** | Would have added automated benchmarks and usage docs from day 1; learned that DX matters as much as functionality |

---

## Story 002 — Label Inconsistency Correction (Self-Supervised)

**Source:** Anote AI MLE Intern
**Best for:** Model quality, evaluation rigor, ML systems design

| | |
|---|---|
| **S** | LLM-labeled training data had inconsistencies degrading downstream model performance |
| **T** | Improve dataset quality 30%+ without full re-labeling |
| **A** | Designed self-supervised loop to detect and correct label drift; built evaluation harness with held-out gold set |
| **R** | 35% dataset quality improvement |
| **Reflection** | Gold-set creation should happen before any labeling pipeline runs; retrofitting is expensive |

---

## Story 003 — Transformer Fine-Tuning (Low-Resource)

**Source:** Anote AI MLE Intern
**Best for:** Fine-tuning, generalization, few-shot learning questions

| | |
|---|---|
| **S** | Client had <1K labeled examples; needed production model performance |
| **T** | Fine-tune transformer to near few-shot capability |
| **A** | Generated synthetic data augmentations; applied transfer learning from a pretrained base |
| **R** | 18% performance uplift on downstream evaluation task |
| **Reflection** | Augmentation strategy mattered more than architecture; tried 3 architectures and baseline augmentation outperformed all |

---

## Story 004 — GAN Pipeline at Scale (Privacy-Preserving)

**Source:** Société Générale Data Scientist
**Best for:** Scalable ML infrastructure, privacy/compliance, production ML, "biggest system you've built"

| | |
|---|---|
| **S** | Regulated financial models required training data but PII made real data unusable |
| **T** | Generate synthetic records that preserve statistical properties without PII |
| **A** | Implemented privacy-preserving GANs with Differential Privacy and federated learning; scaled via Spark |
| **R** | 30M+ synthetic records across 10+ use cases; 60% reduction in data acquisition timelines |
| **Reflection** | DP budget management was the hardest problem — should have documented per-use-case epsilon budgets from the start |

---

## Story 005 — Document Forgery Detection (Fraud / Anomaly)

**Source:** Société Générale Data Scientist
**Best for:** Fraud detection, anomaly detection, computer vision, "impact on compliance"

| | |
|---|---|
| **S** | KYC compliance required human review of every flagged document — unsustainable volume |
| **T** | Automate forgery detection to reduce manual review volume by 50%+ |
| **A** | Built CNN + OCR pipeline to detect tampered regions and structural anomalies in ID documents |
| **R** | 80% reduction in manual review volume; deployed in production |
| **Reflection** | Adversarial test cases (intentionally subtle fakes) should have been in the test set from day 1; caught edge cases late |

---

## Story 006 — Edge Model Optimization (Samsung)

**Source:** Samsung MLE Intern
**Best for:** Systems optimization, inference efficiency, mobile/edge ML

| | |
|---|---|
| **S** | Conditional GAN for document unwarping was too large for Android edge deployment |
| **T** | Reduce model to deployable size with minimal accuracy loss |
| **A** | Applied quantization + transfer learning; ran 180K optimization iterations |
| **R** | 208MB final model; 1.2s inference latency; state-of-art MS-SSIM 0.9492 |
| **Reflection** | Quantization-aware training from the start (not post-training) would have saved significant iterations |
