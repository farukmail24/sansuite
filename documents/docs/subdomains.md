# SanSuite Subdomain Architecture & Implementation Guide

SanSuite-এর মতো বৃহৎ SaaS (Software-as-a-Service) অ্যাপ্লিকেশনগুলোতে বিভিন্ন কাজের জন্য আলাদা আলাদা সাব-ডোমেন ব্যবহার করা হয়। এটি নিরাপত্তা, কর্মদক্ষতা এবং সিস্টেম ব্যবস্থাপনার জন্য অত্যন্ত কার্যকারী।

---

## ১. SanSuite সাব-ডোমেনসমূহের তালিকা

আমরা এনালাইসিস করার সময় নিম্নলিখিত সাব-ডোমেনগুলো পেয়েছি:

| সাব-ডোমেন ইউআরএল | সাব-ডোমেন নাম | কাজ / ভূমিকা |
|---|---|---|
| `https://account.SanSuite.com` | **Ecosystem Dashboard** | এটি মূল প্রবেশদ্বার। ব্যবহারকারী লগইন, রেজিস্ট্রেশন এবং কোন মডিউলে প্রবেশ করবেন (Bookkeeping, Payroll ইত্যাদি) তা এখান থেকে নিয়ন্ত্রণ করা হয়। |
| `https://app.SanSuite.com` / `https://appv4.SanSuite.com` | **Core Accountant Workspace** | হিসাবরক্ষকদের (Accountants) প্রধান কাজের জায়গা। বুককিপিং, ট্যাক্স রিটার্ন (CT600/SA100), ভ্যাট এবং পে-রোল প্রসেস করার ইন্টারফেস এখানে থাকে। |
| `https://myadmin.SanSuite.com` | **Firm Admin Portal** | ফার্মের নিজস্ব সেটিংস, সাবস্ক্রিপশন প্ল্যান, স্টাফদের আইডি ও পারমিশন এবং এইচএমআরসি (HMRC) এজেন্ট ক্রেডেনশিয়াল এখান থেকে পরিচালনা করা হয়। |
| `https://clientportal.SanSuite.com` | **365 Client Portal** | এটি হিসাবরক্ষকদের ক্লায়েন্টদের (Businesses/Individuals) জন্য তৈরি পোর্টাল। ক্লায়েন্টরা এখানে লগইন করে ডকুমেন্ট আপলোড করে এবং ট্যাক্স রিটার্ন অনুমোদন করে। |

---

## ২. সাব-ডোমেন আর্কিটেকচার কিভাবে কাজ করে? (How to Implement)

এই ধরণের সাব-ডোমেন আর্কিটেকচার মূলত ৩টি ধাপে বাস্তবায়ন করা হয়:

### ধাপ ক: DNS কনফিগারেশন (Wildcard DNS)
আপনার ডোমেন প্রোভাইডারের (যেমন GoDaddy, Cloudflare) DNS জোনে একটি ওয়াইল্ডকার্ড বা নির্দিষ্ট সাব-ডোমেন রেকর্ড যোগ করতে হবে:
* **Type:** `A` or `CNAME`
* **Name:** `*.yourdomain.com` (অথবা আলাদাভাবে `app`, `myadmin`, `clientportal` ইত্যাদি)
* **Value:** আপনার সার্ভারের আইপি (IP) বা লোড ব্যালেন্সার ইউআরএল।

### ধাপ খ: রিভার্স প্রক্সি কনফিগারেশন (Reverse Proxy - Nginx/Apache)
একটি রিভার্স প্রক্সি সার্ভার (যেমন Nginx) আগত রিকোয়েস্টের ডোমেন নাম দেখে সঠিক অ্যাপ্লিকেশনে ট্রাফিক পাঠিয়ে দেয়।
```nginx
# app.yourdomain.com এর জন্য কনফিগারেশন
server {
    listen 443 ssl;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000; # Core App Server
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# clientportal.yourdomain.com এর জন্য কনফিগারেশন
server {
    listen 443 ssl;
    server_name clientportal.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000; # Client Portal Server
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### ধাপ গ: সেশন ও কুকি শেয়ারিং (Session & Cookie Management)
সাব-ডোমেনগুলোর মধ্যে ব্যবহারকারীর লগইন সেশন শেয়ার বা আইসোলেট করার জন্য কুকি ডোমেন কনফিগার করতে হবে:
- সেশন শেয়ার করার জন্য কুকি ডোমেন সেট করতে হবে `.yourdomain.com` (এর ফলে এক সাব-ডোমেনে লগইন করলে অন্যটিতেও অটো লগইন থাকবে)।
- সেশন সম্পূর্ণ আলাদা রাখতে কুকি ডোমেনকে সুনির্দিষ্ট করে দিতে হবে (যেমন `clientportal.yourdomain.com` এর সেশন কুকি `app.yourdomain.com`-এ কাজ করবে না)।

---

## ৩. সাব-ডোমেন ব্যবহারের সুবিধাসমূহ (Benefits)

১. **নিরাপত্তা ও সেশন আইসোলেশন (Security & Session Isolation):**
   * ক্লায়েন্টদের জন্য নির্ধারিত পোর্টাল (`clientportal.yourdomain.com`) এবং হিসাবরক্ষকদের অ্যাডমিন প্যানেল (`myadmin.yourdomain.com`) সম্পূর্ণ আলাদা ডোমেনে থাকলে নিরাপত্তা ঝুঁকি অনেক কমে যায়। ক্লায়েন্ট পোর্টাল হ্যাক হলেও মূল কোড বা অ্যাডমিন সেশন নিরাপদ থাকে।

২. **আলাদা স্কেলিং ও পারফরম্যান্স (Independent Scaling):**
   * সাধারণ হিসাবরক্ষক বা ক্লায়েন্টদের ট্রাফিকের পরিমাণ ভিন্ন হয়। `app.yourdomain.com` (যেখানে জটিল গণনা ও ডাটাবেজ প্রসেসিং বেশি হয়) সার্ভারটিকে ভারী ট্রাফিকের জন্য স্কেল করা যায়, অন্যদিকে মূল ল্যান্ডিং পেজ বা ড্যাশবোর্ড হালকা সার্ভারেই চলতে পারে।

৩. **সহজ কোড ম্যানেজমেন্ট ও ডেপ্লয়মেন্ট (Clean Codebase & Independent Deployments):**
   * প্রতিটি সাব-ডোমেনকে আলাদা রেপোজিটরি (Micro-Frontend) হিসেবে কোড করা সম্ভব। যেমন, ক্লায়েন্ট পোর্টালের কোড বা ডিজাইন পরিবর্তনের জন্য মূল বুককিপিং বা পে-রোল অ্যাপ্লিকেশনে কোনো রিস্টার্ট বা ডাউনটাইমের ঝুঁকি নিতে হয় না।

৪. **পরিচ্ছন্ন ব্র্যান্ডিং (Professional Branding):**
   * ক্লায়েন্ট ও স্টাফদের জন্য আলাদা ইউআরএল সরবরাহ করা ব্যবসার পেশাদারিত্ব প্রকাশ করে।
