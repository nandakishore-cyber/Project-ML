# ⚡ Dynamic Pricing System

<div align="center">

**AI-Powered Real-Time Pricing Engine for E-Commerce**

An intelligent pricing platform that leverages XGBoost machine learning to automatically optimize product prices based on demand, competition, seasonality, and market signals — delivering the best deal to customers while maximizing revenue.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-orange?style=for-the-badge)](https://xgboost.readthedocs.io)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## 👥 Team Members

| Name | Role |
|------|------|
| **Nanda Kishore K S** | Project Lead & Full-Stack Developer |
| **Mathesvaran J** | Backend Developer & ML Integration |
| **Krishna Kumar E** | Machine Learning Engineer |
| **Mohamed Apsal M** | Frontend Developer & UI/UX |

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [System Architecture](#️-system-architecture)
- [Project Structure](#-project-structure)
- [Machine Learning Pipeline](#-machine-learning-pipeline)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Usage](#-usage)

---

## 📖 About the Project

The **Dynamic Pricing System** is a full-stack e-commerce platform that implements real-time, AI-driven pricing for electronic products. Unlike traditional fixed-pricing models, this system continuously analyzes market signals — competitor pricing, consumer demand, inventory levels, customer ratings, seasonal trends, and discount factors — to compute an optimal price for every product.

The core ML engine uses **XGBoost regression models** trained independently for each product category × segment combination (e.g., *"Laptops – Premium"*, *"Mobile Phones – Budget"*), ensuring highly specialized and accurate predictions. Prices are automatically updated on a schedule (Mon / Wed / Fri at 9:00 AM) and can also be triggered manually by admins via the dashboard.

### Problem Statement

Traditional e-commerce platforms use static pricing that doesn't adapt to:
- 📉 Fluctuating market demand
- 💰 Competitor price changes
- 🎄 Seasonal trends (festive seasons, holidays)
- 📦 Inventory levels (overstocked vs. scarce products)

This leads to either **lost revenue** (pricing too low) or **lost customers** (pricing too high).

### Our Solution

A machine learning–powered pricing engine that:
- **Analyzes 9+ features** per product to predict optimal prices
- **Caps prices at 125% of base price** to prevent unfair markups
- **Applies psychological pricing** (₹X,999 instead of ₹X,000)
- **Updates prices automatically** on a recurring schedule
- **Provides a full e-commerce frontend** for customers and admins

---

## ✨ Key Features

### 🤖 Machine Learning
- **XGBoost per-segment models** — separate model per (category × sub_category) pair
- **Feature engineering** — base price, competitor price, demand, rating, reviews, stock, discount, season, day of week
- **Price cap enforcement** — predicted prices are capped at 125% of base price
- **Psychological pricing** — rounds to nearest ₹50 − ₹1 (e.g., ₹14,999)
- **Pre-trained model bundle** — serialized as `xgb_pricing_bundle.pkl` (~10 MB)

### 🛒 E-Commerce Platform
- **Product Catalog** — browse by categories: Mobile Phones, Laptops, TVs, Earphones, Smartwatches, Cameras
- **Segment Filters** — filter by Budget, Mid-Range, and Premium segments
- **Dynamic Price Tags** — real-time prices with "Last updated X hours ago" indicators
- **Shopping Cart** — add/update/remove items with live price reflection
- **Order Management** — checkout with Razorpay payment integration
- **User Authentication** — JWT-based signup/login with bcrypt password hashing

### 🔧 Admin Dashboard
- **Statistics Overview** — total products, orders, and users at a glance
- **ML Pipeline Trigger** — manually run the XGBoost pricing engine
- **Product Management** — add, edit, and delete products
- **Order Management** — view and track all customer orders

### ⏰ Automated Scheduling
- **APScheduler integration** — prices auto-update every Monday, Wednesday, and Friday at 9:00 AM
- **Status monitoring** — check last run time and pipeline status

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Python 3.10+** | Core language |
| **FastAPI** | REST API framework |
| **SQLAlchemy** | ORM for database operations |
| **PostgreSQL** | Relational database |
| **Uvicorn** | ASGI server |
| **APScheduler** | Automated pricing schedule |
| **Passlib + bcrypt** | Password hashing |
| **python-jose** | JWT token generation |

### Machine Learning

| Technology | Purpose |
|------------|---------|
| **XGBoost** | Gradient boosting regression models |
| **Pandas** | Data manipulation & feature engineering |
| **NumPy** | Numerical computations |
| **scikit-learn** | Train/test split, evaluation metrics |
| **Matplotlib + Seaborn** | Model performance visualization |

### Frontend

| Technology | Purpose |
|------------|---------|
| **HTML5** | Page structure |
| **CSS3 (Vanilla)** | Styling with custom design system |
| **JavaScript (ES6+)** | Client-side logic |
| **Inter (Google Fonts)** | Typography |
| **Razorpay** | Payment gateway integration |

---

## 🏗️ System Architecture

```text
┌─────────────────────┐     HTTP/REST      ┌──────────────────────────┐
│                     │ ◄────────────────── │                          │
│   Frontend (HTML)   │                     │  FastAPI Backend (:8000) │
│   Live Server :5500 │ ──────────────────► │                          │
│                     │                     │  ┌────────────────────┐  │
│  • Product Pages    │                     │  │  Routes            │  │
│  • Cart / Checkout  │                     │  │  • /auth/*         │  │
│  • Orders           │                     │  │  • /products/*     │  │
│  • Admin Dashboard  │                     │  │  • /cart/*         │  │
│                     │                     │  │  • /orders/*       │  │
└─────────────────────┘                     │  │  • /admin/*        │  │
                                            │  └────────┬───────────┘  │
                                            │           │              │
                                            │  ┌────────▼───────────┐  │
                                            │  │  SQLAlchemy ORM    │  │
                                            │  └────────┬───────────┘  │
                                            │           │              │
                                            │  ┌────────▼───────────┐  │
                                            │  │  ML Pricing        │  │
                                            │  │  Service (XGBoost) │  │
                                            │  └────────────────────┘  │
                                            └──────────┬───────────────┘
                                                       │
                                            ┌──────────▼──────────┐
                                            │    PostgreSQL       │
                                            │    Dyn_Pri_DB       │
                                            │    (:5432)          │
                                            └─────────────────────┘
