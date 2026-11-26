"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import {
  CheckCircle2,
  CreditCard,
  Eye,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Tag,
  Truck,
  UserCheck,
  X,
} from "lucide-react";
import {
  KEYS,
  inr,
  useStored,
  getAccountAddressKey,
  type Address,
  type AppUser,
  type CartItem,
} from "@/lib/izha-store";
import { apiUrl } from "@/lib/api-config";
import {
  DEFAULT_ADMIN_PRODUCTS,
  DEFAULT_COUPONS,
  DEFAULT_CUSTOMERS,
  DEFAULT_OFFER_SETTINGS,
  DEFAULT_ORDERS,
  checkIndiaPincode,
  type AdminProduct,
  type Coupon,
  type DemoCustomer,
  type DemoOrder,
  type OfferSettings,
} from "@/lib/demo-store";
import {
  DEFAULT_DELIVERY_SETTINGS,
  calculateDeliveryCharge,
  type DeliverySettings,
} from "@/lib/delivery";
import { WhatsAppSvg } from "@/components/WhatsAppFloat";
import AlertBox from "@/components/izha/AlertBox";
import { trackEvent } from "@/lib/visit-tracker";
import AuthModal from "@/components/izha/AuthModal";
import {
  EmptyBlock,
  FlowerBadge,
  PageShell,
  PageTitle,
  card,
  cardCream,
  focusRing,
  inputCls,
  outlineBtn,
  serif,
  solidBtn,
} from "@/components/izha/ui";

type CheckoutMode = "guest" | "signin" | "register";
type PaymentMethod = "Razorpay" | "UPI" | "Cash on Delivery";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const [cart, setCart, ready] = useStored<CartItem[]>(KEYS.cart, []);
  const [user, setUser] = useStored<AppUser | null>(KEYS.user, null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [coupons, setCoupons] = useStored<Coupon[]>(KEYS.coupons, DEFAULT_COUPONS);
  const [offers, setOffers] = useStored<OfferSettings>(KEYS.offers, DEFAULT_OFFER_SETTINGS);
  const [deliverySettings, setDeliverySettings] = useStored<DeliverySettings>(
    KEYS.deliverySettings,
    DEFAULT_DELIVERY_SETTINGS
  );
  const [orders, setOrders] = useStored<DemoOrder[]>(KEYS.orders, DEFAULT_ORDERS);
  const [customers, setCustomers] = useStored<DemoCustomer[]>(
    KEYS.customers,
    DEFAULT_CUSTOMERS
  );
  const [adminProducts, setAdminProducts] = useStored<AdminProduct[]>(
    KEYS.adminProducts,
    []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackEvent("checkout_start");
    fetch("/api/coupons")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.coupons) && data.coupons.length > 0) {
          setCoupons(data.coupons);
        }
      })
      .catch(() => {});

    fetch("/api/content/offers")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data && typeof data.data === "object") {
          setOffers((prev) => ({ ...prev, ...data.data }));
        }
      })
      .catch(() => {});

    fetch("/api/delivery-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.settings) {
          setDeliverySettings(data.settings);
        }
      })
      .catch(() => {});
  }, [setCoupons, setOffers, setDeliverySettings]);

  const [mode, setMode] = useState<CheckoutMode>("guest");
  const [authModal, setAuthModal] = useState<"signin" | "register" | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("default");
  const [saveAddressToProfile, setSaveAddressToProfile] = useState<boolean>(true);
  const [newAddressLabel, setNewAddressLabel] = useState<string>("Home");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("Kerala");
  const [pincode, setPincode] = useState("");
  const [password, setPassword] = useState("");

  // Load customer-specific saved addresses from database API using current auth token
  useEffect(() => {
    // When user changes or logs out, always reset previous customer's address form fields
    setAddress("");
    setCity("");
    setStateName("Kerala");
    setPincode("");
    setSelectedAddressId("new");
    setSavedAddresses([]);

    const isAdm =
      !user ||
      user.role === "admin" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "SECONDARY_ADMIN" ||
      user.isAdmin === true;

    if (user && !isAdm) {
      setMode("signin");
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");

      const storageKey = getAccountAddressKey(user);
      if (storageKey && typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSavedAddresses(parsed);
              const def = parsed.find((a: any) => a.isDefault) || parsed[0];
              setSelectedAddressId(def.id);
              setAddress(def.line);
              setCity(def.city);
              setStateName(def.state || "Kerala");
              setPincode(def.pincode);
              if (def.name) setName(def.name);
              if (def.phone) setPhone(def.phone);
            }
          }
        } catch (_) {}
      }

      const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
      if (token) {
        fetch(apiUrl("/auth/addresses"), {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success && Array.isArray(data.addresses)) {
              const addrs = data.addresses.map((a: any) => ({
                id: a.id,
                label: a.label || "Home",
                name: a.name || user.name || "",
                phone: a.phone || user.phone || "",
                line: a.line || "",
                city: a.city || "",
                state: a.state || "Kerala",
                pincode: a.pincode || "",
                isDefault: Boolean(a.is_default || a.isDefault),
              }));
              setSavedAddresses(addrs);
              if (storageKey && typeof window !== "undefined") {
                try {
                  localStorage.setItem(storageKey, JSON.stringify(addrs));
                } catch (_) {}
              }
              if (addrs.length > 0) {
                const def = addrs.find((a: any) => a.isDefault) || addrs[0];
                setSelectedAddressId(def.id);
                setAddress(def.line);
                setCity(def.city);
                setStateName(def.state || "Kerala");
                setPincode(def.pincode);
                if (def.name) setName(def.name);
                if (def.phone) setPhone(def.phone);
              } else {
                setSelectedAddressId("new");
              }
            } else {
              setSavedAddresses([]);
              setSelectedAddressId("new");
            }
          })
          .catch(() => {
            setSavedAddresses([]);
            setSelectedAddressId("new");
          });
      }
    } else {
      setMode(user && isAdm ? "signin" : "guest");
      setName(user?.name || "");
      setEmail(user?.email || "");
      setPhone(user?.phone || "");
      setSavedAddresses([]);
      setSelectedAddressId("new");
    }
  }, [user?.id, user?.email, user?.phone]);

  const handleSelectSavedAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    if (addr.name) setName(addr.name);
    else if (user?.name) setName(user.name);
    if (addr.phone) setPhone(addr.phone);
    else if (user?.phone) setPhone(user.phone);
    setAddress(addr.line || "");
    setCity(addr.city || "");
    setStateName(addr.state || "Kerala");
    setPincode(addr.pincode || "");
    setPinChecked(null);
    setError("");
  };

  const handleAddNewAddress = () => {
    setSelectedAddressId("new");
    if (user?.name) setName(user.name);
    if (user?.phone) setPhone(user.phone);
    setAddress("");
    setCity("");
    setStateName("Kerala");
    setPincode("");
    setPinChecked(null);
    setSaveAddressToProfile(true);
    setError("");
  };

  const handleBackToSaved = () => {
    const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
    if (defaultAddr) {
      handleSelectSavedAddress(defaultAddr);
    }
  };

  // Inline sign-in state
  const [signinId, setSigninId] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [authNote, setAuthNote] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // PIN code serviceability check state
  const [pinChecked, setPinChecked] = useState<ReturnType<typeof checkIndiaPincode> | null>(
    null
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Razorpay");
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<DemoOrder | null>(null);

  const { subtotal, productSavings, totalQty } = useMemo(() => {
    let subtotal = 0;
    let productSavings = 0;
    let totalQty = 0;
    for (const item of cart) {
      subtotal += item.price * item.qty;
      totalQty += item.qty;
      if (item.oldPrice && item.oldPrice > item.price) {
        productSavings += (item.oldPrice - item.price) * item.qty;
      }
    }
    return { subtotal, productSavings, totalQty };
  }, [cart]);

  const comboDiscount = useMemo(() => {
    if (!offers.comboEnabled || totalQty < offers.comboMinItems) return 0;
    return Math.round((subtotal * offers.comboDiscountPct) / 100);
  }, [offers, subtotal, totalQty]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (subtotal < appliedCoupon.minOrder) return 0;
    return appliedCoupon.type === "percent"
      ? Math.round((subtotal * appliedCoupon.value) / 100)
      : Math.min(subtotal, appliedCoupon.value);
  }, [appliedCoupon, subtotal]);

  const totalDiscount = comboDiscount + couponDiscount;
  const netOrderSubtotal = Math.max(0, subtotal - totalDiscount);

  const activeDeliveryInfo = useMemo(() => {
    return calculateDeliveryCharge(deliverySettings, {
      subtotal: netOrderSubtotal,
      state: stateName,
      pincode,
    });
  }, [deliverySettings, netOrderSubtotal, stateName, pincode]);

  const activePinCheck = useMemo(() => {
    if (pinChecked) return pinChecked;
    if (/^[1-8]\d{5}$/.test(pincode.trim())) {
      const isKerala = /^6[7-9]\d{4}$/.test(pincode.trim()) || stateName.toLowerCase().includes("kerala");
      const eta = isKerala ? "2–4 business days" : "4–7 business days";
      let msg = `Serviceable in ${activeDeliveryInfo.regionName} · Delivery in ${eta}.`;
      if (activeDeliveryInfo.isFreeDelivery) {
        msg = `Serviceable in ${activeDeliveryInfo.regionName} · Free Delivery (${eta})!`;
      } else if (activeDeliveryInfo.amountNeededForFreeDelivery > 0 && activeDeliveryInfo.isEligibleForFreeDelivery) {
        msg = `Serviceable in ${activeDeliveryInfo.regionName} · ₹${activeDeliveryInfo.deliveryCharge} delivery (${eta}). Add ₹${activeDeliveryInfo.amountNeededForFreeDelivery.toLocaleString("en-IN")} more to qualify for free delivery!`;
      } else {
        msg = `Serviceable in ${activeDeliveryInfo.regionName} · ₹${activeDeliveryInfo.deliveryCharge} delivery (${eta}).`;
      }
      return {
        valid: true,
        serviceable: true,
        region: activeDeliveryInfo.regionName as any,
        eta,
        shipping: activeDeliveryInfo.deliveryCharge,
        message: msg,
      };
    }
    return null;
  }, [pinChecked, pincode, stateName, activeDeliveryInfo]);

  const shippingCost = activeDeliveryInfo.deliveryCharge;
  const finalPayable = Math.max(0, netOrderSubtotal + shippingCost);

  const changeQty = (id: string, size: string, delta: number) => {
    const prod = adminProducts.find((p) => String(p.id) === String(id));
    const availableStock = prod ? Number(prod.stock) : 999;
    setCart((items) =>
      items.map((i) => {
        if (i.id === id && i.size === size) {
          const newQty = i.qty + delta;
          if (delta > 0 && newQty > availableStock) {
            setError(
              availableStock <= 0
                ? `Sorry! "${i.name}" is currently out of stock.`
                : `Sorry! Only ${availableStock} units of "${i.name}" are currently available in stock.`
            );
            return i;
          }
          return { ...i, qty: Math.min(10, Math.max(1, newQty)) };
        }
        return i;
      })
    );
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponMsg({ ok: false, text: "Enter a coupon code to apply." });
      return;
    }
    setIsValidatingCoupon(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal,
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.valid) {
        setAppliedCoupon(null);
        setCouponMsg({
          ok: false,
          text: data.message || `Coupon "${code}" could not be applied.`,
        });
        return;
      }

      setAppliedCoupon(data.coupon);
      setCouponMsg({
        ok: true,
        text: `Coupon ${data.coupon.code} applied (${
          data.coupon.type === "percent"
            ? `${data.coupon.value}% OFF (−${inr(data.discount)})`
            : `${inr(data.discount)} OFF`
        })!`,
      });
    } catch {
      setCouponMsg({ ok: false, text: "Failed to validate coupon. Please try again." });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCheckPincode = () => {
    const clean = pincode.trim();
    if (!/^[1-8]\d{5}$/.test(clean)) {
      setPinChecked({
        valid: false,
        serviceable: false,
        region: "",
        eta: "",
        shipping: activeDeliveryInfo.deliveryCharge,
        message: "Enter a valid 6-digit Indian PIN code (e.g., 683101 or 560001).",
      });
      return;
    }

    const isKerala = /^6[7-9]\d{4}$/.test(clean) || stateName.toLowerCase().includes("kerala");
    const eta = isKerala ? "2–4 business days" : "4–7 business days";
    let msg = `Serviceable in ${activeDeliveryInfo.regionName} · Delivery in ${eta}.`;
    if (activeDeliveryInfo.isFreeDelivery) {
      msg = `Serviceable in ${activeDeliveryInfo.regionName} · Free Delivery (${eta})!`;
    } else if (activeDeliveryInfo.amountNeededForFreeDelivery > 0 && activeDeliveryInfo.isEligibleForFreeDelivery) {
      msg = `Serviceable in ${activeDeliveryInfo.regionName} · ₹${activeDeliveryInfo.deliveryCharge} delivery (${eta}). Add ₹${activeDeliveryInfo.amountNeededForFreeDelivery.toLocaleString("en-IN")} more to qualify for free delivery!`;
    } else {
      msg = `Serviceable in ${activeDeliveryInfo.regionName} · ₹${activeDeliveryInfo.deliveryCharge} delivery charge (${eta}).`;
    }

    setPinChecked({
      valid: true,
      serviceable: true,
      region: activeDeliveryInfo.regionName as any,
      eta,
      shipping: activeDeliveryInfo.deliveryCharge,
      message: msg,
    });
  };

  const handleInlineSignin = () => {
    const id = signinId.trim();
    if (!/^\S+@\S+\.\S+$/.test(id) && !/^[6-9]\d{9}$/.test(id)) {
      setAuthNote("Enter a valid email address or 10-digit mobile number.");
      return;
    }
    if (signinPassword.length < 6) {
      setAuthNote("Password must be at least 6 characters.");
      return;
    }
    const isMail = /^\S+@\S+\.\S+$/.test(id);
    const existingCust = customers.find(
      (c) =>
        (isMail && c.email.toLowerCase() === id.toLowerCase()) ||
        (!isMail && c.phone === id)
    );
    const resolvedName =
      existingCust?.name ||
      name.trim() ||
      (isMail ? id.split("@")[0] : "IZHA Circle Member");
    const resolvedEmail = isMail ? id : existingCust?.email || email.trim();
    const resolvedPhone = !isMail ? id : existingCust?.phone || phone.trim();

    const loggedUser: AppUser = {
      name: resolvedName,
      email: resolvedEmail,
      phone: resolvedPhone,
      role: "customer",
    };
    setUser(loggedUser);
    setName(resolvedName);
    if (resolvedEmail) setEmail(resolvedEmail);
    if (resolvedPhone) setPhone(resolvedPhone);
    setMode("signin");
    setAuthNote("Signed in! Your details are ready for checkout.");
  };

  const handlePlaceOrder = async () => {
    if (name.trim().length < 2) return setError("Please enter the recipient's full name.");
    if (!/^[6-9]\d{9}$/.test(phone.trim()))
      return setError("Please enter a valid 10-digit Indian mobile number.");
    if (address.trim().length < 6)
      return setError("Please enter your complete house / street delivery address.");
    if (city.trim().length < 2) return setError("Please enter your town or city.");
    const pinClean = pincode.trim();
    if (pinClean.length > 0 && !/^[1-8]\d{5}$/.test(pinClean)) {
      return setError("Please enter a valid 6-digit Indian PIN code.");
    }

    if (mode === "register" && !user) {
      if (!/^\S+@\S+\.\S+$/.test(email.trim()))
        return setError("Enter a valid email address to create your IZHA Circle account.");
      if (password.length < 6)
        return setError("Choose a password of at least 6 characters to create your account.");
      setUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: "customer",
      });
    }

    // Check inventory availability before proceeding
    for (const item of cart) {
      const prod = adminProducts.find((p) => String(p.id) === String(item.id));
      if (prod) {
        if (prod.stock <= 0) {
          return setError(`Sorry! "${item.name}" is currently out of stock.`);
        }
        if (item.qty > prod.stock) {
          return setError(
            `Sorry! Only ${prod.stock} units of "${item.name}" are available. Please update your cart quantity.`
          );
        }
      }
    }

    setError("");
    setIsSubmitting(true);

    try {
      // Automatically save new address to customer's profile if checkbox is checked
      if ((selectedAddressId === "new" || savedAddresses.length === 0) && saveAddressToProfile) {
        const newAddressItem: Address = {
          id: `a${Date.now()}`,
          label: newAddressLabel || "Home",
          name: name.trim(),
          phone: phone.trim(),
          line: address.trim(),
          city: city.trim(),
          pincode: pincode.trim(),
          isDefault: savedAddresses.length === 0,
        };
        setSavedAddresses((prev) => {
          const alreadyExists = prev.some(
            (a) =>
              a.line.trim().toLowerCase() === newAddressItem.line.toLowerCase() &&
              a.pincode === newAddressItem.pincode
          );
          return alreadyExists ? prev : [...prev, newAddressItem];
        });

        // Persist to database for this authenticated customer
        const token = typeof window !== "undefined" ? localStorage.getItem(KEYS.token) : null;
        const storageKey = getAccountAddressKey(user);
        if (storageKey && typeof window !== "undefined") {
          try {
            const cur = JSON.parse(localStorage.getItem(storageKey) || "[]");
            localStorage.setItem(storageKey, JSON.stringify([...cur, newAddressItem]));
          } catch (_) {}
        }
        if (token) {
          fetch(apiUrl("/auth/addresses"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: name.trim(),
              phone: phone.trim(),
              line: address.trim(),
              city: city.trim(),
              state: stateName.trim() || activeDeliveryInfo.regionName,
              pincode: pincode.trim(),
              isDefault: savedAddresses.length === 0,
            }),
          }).catch(() => {});
        }
      }

      const todayDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const orderNumber = `IZH${todayDateStr}${String(101 + orders.length).padStart(3, "0")}`;
      const existingCustomer = customers.find(
        (c) =>
          (phone.trim() && c.phone === phone.trim()) ||
          (email.trim() && c.email.toLowerCase() === email.trim().toLowerCase())
      );

      let customerId: string;
      if (mode === "guest") {
        // Guest Checkout: do NOT create a permanent customer account
        customerId = existingCustomer?.id ?? `guest-${Date.now()}`;
      } else {
        // Registered customer / new registration: associate with permanent customer account
        customerId = existingCustomer?.id ?? `cust-${Date.now()}`;
        if (!existingCustomer) {
          const newCustomer: DemoCustomer = {
            id: customerId,
            name: name.trim(),
            email: email.trim() || `${phone.trim()}@izhablooms.in`,
            phone: phone.trim(),
            city: city.trim(),
            state: stateName.trim() || activeDeliveryInfo.regionName,
            pincode: pincode.trim(),
            address: address.trim(),
            joinedAt: new Date().toISOString().slice(0, 10),
            source: "Direct",
            savedAddresses: [
              {
                id: `addr-${Date.now()}`,
                label: "Default",
                name: name.trim(),
                phone: phone.trim(),
                line: address.trim(),
                city: city.trim(),
                pincode: pincode.trim(),
                isDefault: true,
              },
            ],
          };
          setCustomers((prev) => [newCustomer, ...prev]);
        }
      }

      const persistOrderRecord = async (payInfo: {
        paymentMethod: "UPI" | "Card" | "NetBanking" | "Cash on Delivery" | "Razorpay";
        paymentStatus: "Paid" | "COD Pending";
        paymentRef: string;
      }) => {
        const newOrder: DemoOrder = {
          id: orderNumber,
          createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          customerId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail:
            email.trim() ||
            (mode === "guest" ? "guest@izhablooms.in" : `${phone.trim()}@izhablooms.in`),
          address: address.trim(),
          city: city.trim(),
          state: stateName.trim() || activeDeliveryInfo.regionName,
          pincode: pincode.trim(),
          items: cart.map((c) => ({
            id: c.id,
            name: c.name,
            image: c.image,
            size: c.size,
            qty: c.qty,
            price: c.price,
          })),
          subtotal,
          discount: totalDiscount,
          couponCode: appliedCoupon?.code,
          shipping: shippingCost,
          total: finalPayable,
          paymentMethod: payInfo.paymentMethod,
          paymentStatus: payInfo.paymentStatus,
          paymentRef: payInfo.paymentRef,
          status: "Processing",
          source: "Direct",
        };

        // Persist order to TiDB Cloud backend with transactional inventory verification & deduction
        const res = await fetch(apiUrl("/orders"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: name.trim(),
            customerEmail:
              email.trim() ||
              (mode === "guest" ? "guest@izhablooms.in" : `${phone.trim()}@izhablooms.in`),
            customerPhone: phone.trim(),
            shippingAddress: {
              name: name.trim(),
              phone: phone.trim(),
              line: address.trim(),
              city: city.trim(),
              state: stateName.trim() || activeDeliveryInfo.regionName,
              pincode: pincode.trim(),
            },
            items: newOrder.items,
            subtotal: newOrder.subtotal,
            discount: newOrder.discount,
            shippingFee: newOrder.shipping,
            total: newOrder.total,
            paymentMethod: newOrder.paymentMethod,
            paymentStatus: newOrder.paymentStatus,
            paymentRef: newOrder.paymentRef,
            couponCode: appliedCoupon?.code || null,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to place order. Please check stock availability.");
          setIsSubmitting(false);
          return;
        }

        // Sync updated stock from server immediately
        if (Array.isArray(data.updatedProducts) && data.updatedProducts.length > 0) {
          setAdminProducts(data.updatedProducts);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("izha-store-sync", { detail: KEYS.adminProducts })
            );
            window.dispatchEvent(
              new CustomEvent("izha-store-sync", { detail: KEYS.orders })
            );
          }
        }

        const placedRecord = data.order
          ? {
              ...newOrder,
              id: data.order.orderNumber || data.order.id,
              total: data.order.total !== undefined ? Number(data.order.total) : newOrder.total,
            }
          : newOrder;

        setOrders((prev) => [placedRecord, ...prev]);
        setCart([]);
        setPlacedOrder(placedRecord);
        trackEvent("order_placed", { customerName: name.trim() });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("izha-store-sync", { detail: KEYS.orders })
          );
        }
        setIsSubmitting(false);
      };

      if (paymentMethod === "Cash on Delivery") {
        await persistOrderRecord({
          paymentMethod: "Cash on Delivery",
          paymentStatus: "COD Pending",
          paymentRef: `COD-${Math.floor(100000 + Math.random() * 899999)}`,
        });
        return;
      }

      // Razorpay Standard Web Checkout
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setIsSubmitting(false);
        return setError("Failed to load Razorpay payment gateway. Please check your internet connection.");
      }

      // Minimum amount is 100 paise (₹1.00)
      const amountInPaise = Math.max(100, Math.round(finalPayable * 100));

      // Step 1: Create Order on backend
      const createRes = await fetch(apiUrl("/create-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${orderNumber}`,
          notes: {
            orderNumber,
            customerName: name.trim(),
            customerPhone: phone.trim(),
          },
        }),
      });

      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createData.success) {
        setIsSubmitting(false);
        return setError(createData.message || "Failed to initialize Razorpay checkout. Please try again.");
      }

      const razorpayKey =
        createData.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_test_U4fWdX0XOdD7tg";

      // Step 2: Open Razorpay checkout modal
      const options: any = {
        key: razorpayKey,
        amount: createData.amount || amountInPaise,
        currency: createData.currency || "INR",
        name: "Izha Blooms",
        description: `Order ${orderNumber}`,
        prefill: {
          name: name.trim(),
          email: email.trim() || undefined,
          contact: phone.trim(),
        },
        notes: {
          orderNumber,
          address: address.trim(),
          pincode: pincode.trim(),
        },
        theme: {
          color: "#B20947",
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            setError("Payment was cancelled. You can try again or choose Cash on Delivery.");
          },
        },
        handler: async function (paymentResponse: any) {
          try {
            // Step 3: Verify payment signature on backend
            const verifyRes = await fetch(apiUrl("/verify-payment"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id || null,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature || null,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok || !verifyData.success || !verifyData.verified) {
              setIsSubmitting(false);
              return setError(
                verifyData.message || "Payment verification failed. Please contact support."
              );
            }

            // Persist order with verified Razorpay payment details
            await persistOrderRecord({
              paymentMethod: "Razorpay",
              paymentStatus: "Paid",
              paymentRef: paymentResponse.razorpay_payment_id,
            });
          } catch (err: any) {
            setIsSubmitting(false);
            setError(err?.message || "An error occurred while confirming your payment.");
          }
        },
      };

      // Attach server-created order_id if present
      if (createData.order_id) {
        options.order_id = createData.order_id;
      }

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", function (response: any) {
        setIsSubmitting(false);
        const failureReason =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment was declined. Please try again or choose Cash on Delivery.";
        setError(`Payment Failed: ${failureReason}`);
      });

      razorpayInstance.open();
    } catch (err) {
      setError("An unexpected error occurred while placing your order. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl py-6 sm:py-8">
          <div className={`${card} relative px-4 pb-6 pt-10 text-center sm:px-10 sm:pb-8`}>
            <FlowerBadge />
            <CheckCircle2 size={46} className="mx-auto text-[#5f7a62]" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#B20947]">
              Order Confirmed
            </p>
            <h1 className={`${serif} mt-1 break-words text-[28px] font-medium text-[#332B2B] sm:text-[34px]`}>
              Thank you, {placedOrder.customerName}!
            </h1>
            <p className="mt-2 break-words text-[14px] text-[#6f6565]">
              Your Izha Blooms order <strong className="text-[#332B2B]">{placedOrder.id}</strong>{" "}
              is confirmed and queued for dispatch to {placedOrder.city}, {placedOrder.pincode}.
            </p>

            <div className="mt-6 rounded-xl border border-[#E8CFD2] bg-[#FCF8F3] p-3 text-left text-[13px] sm:p-4">
              <div className="flex flex-wrap justify-between gap-2 border-b border-[#E8CFD2] pb-3">
                <span>
                  Payment: <strong>{placedOrder.paymentMethod}</strong> ({placedOrder.paymentStatus})
                </span>
                <span>
                  Total Paid: <strong>{inr(placedOrder.total)}</strong>
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {placedOrder.items.map((item) => (
                  <li key={`${item.id}-${item.size}`} className="flex justify-between gap-2">
                    <span className="min-w-0 break-words">
                      {item.name} · Size {item.size} × {item.qty}
                    </span>
                    <span className="shrink-0 font-medium">{inr(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link
                href={`/track-order?phone=${encodeURIComponent(placedOrder.customerPhone || "")}&orderId=${encodeURIComponent(placedOrder.id)}`}
                className={`${solidBtn} w-full justify-center text-center sm:w-auto`}
              >
                Track Order
              </Link>
              <Link href="/shop" className={`${outlineBtn} w-full justify-center text-center sm:w-auto`}>
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <PageTitle
        title="Checkout"
        sub="Complete your order as a guest, sign in to your account, or join the IZHA Circle."
      />

      {ready && cart.length === 0 && (
        <EmptyBlock
          text="Your shopping bag is empty"
          href="/shop"
          action="Explore Styles"
        />
      )}

      {ready && cart.length > 0 && (
        <div className="mt-6 grid gap-6 sm:mt-10 lg:grid-cols-[1.2fr_400px] lg:gap-8">
          <div className="min-w-0 space-y-4 sm:space-y-6">
            {/* 3 Checkout Options */}
            <section className={`${card} p-4 sm:p-6`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B5607A]">
                STEP 1 · CHOOSE HOW YOU WOULD LIKE TO CHECKOUT
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    {
                      id: "guest",
                      label: "Continue as Guest",
                      sub: "Quick checkout. No account required.",
                    },
                    {
                      id: "signin",
                      label: "Sign In",
                      sub: user
                        ? `Signed in as ${user.name}`
                        : "For existing IZHA Blooms customers.",
                    },
                    {
                      id: "register",
                      label: "Create an Account",
                      sub: user
                        ? `Account: ${user.name}`
                        : "Join the IZHA Circle and enjoy member privileges.",
                    },
                  ] as const
                ).map((opt) => {
                  const active = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setMode(opt.id);
                        if (opt.id === "signin" && !user) {
                          setAuthModal("signin");
                        } else if (opt.id === "register" && !user) {
                          setAuthModal("register");
                        }
                      }}
                      className={`flex min-w-0 flex-col justify-between rounded-xl border p-3.5 text-left transition-all sm:p-4 ${focusRing} ${
                        active
                          ? "border-[#B20947] bg-[#FFF5F7] shadow-sm ring-1 ring-[#B20947]/30"
                          : "border-[#E8CFD2] bg-[#FCF8F3] hover:border-[#E99A9F]"
                      }`}
                    >
                      <div>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${
                            active ? "text-[#B20947]" : "text-[#B5607A]"
                          }`}
                        >
                          Option {opt.id === "guest" ? "1" : opt.id === "signin" ? "2" : "3"}
                        </span>
                        <p
                          className={`mt-1 text-[14px] font-semibold leading-snug ${
                            active ? "text-[#B20947]" : "text-[#332B2B]"
                          }`}
                        >
                          {opt.label}
                        </p>
                      </div>
                      <p className="mt-2 break-words text-[12px] leading-snug text-[#6f6565]">
                        {opt.sub}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Status or action banner according to mode */}
              {mode === "guest" && (
                <div className="mt-4 rounded-xl border border-[#E8CFD2] bg-[#FFF9F4] p-3.5 text-[13px] text-[#6f6565]">
                  <p>
                    Checking out as a <strong className="text-[#332B2B]">Guest</strong>. No account required. Fill in your delivery details below to proceed.
                  </p>
                </div>
              )}

              {mode === "signin" && !user && (
                <div className="mt-4 rounded-xl border border-[#E8CFD2] bg-[#FCF8F3] p-3.5 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-[#332B2B]">
                        Sign in to your IZHA BLOOMS account
                      </p>
                      <p className="text-[12px] text-[#6f6565]">
                        Access your saved addresses and order history.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthModal("signin")}
                      className={`${solidBtn} w-full shrink-0 py-2.5 text-[12px] sm:w-auto`}
                    >
                      Open Sign In Modal
                    </button>
                  </div>

                  <div className="mt-4 border-t border-[#E8CFD2] pt-3">
                    <p className="text-[12px] font-medium text-[#6f6565]">
                      Or sign in directly below:
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        className={inputCls}
                        value={signinId}
                        placeholder="Email or mobile number"
                        onChange={(e) => setSigninId(e.target.value)}
                      />
                      <input
                        type="password"
                        className={inputCls}
                        value={signinPassword}
                        placeholder="Password"
                        onChange={(e) => setSigninPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleInlineSignin}
                        className={`${outlineBtn} w-full justify-center sm:w-auto`}
                      >
                        Sign In
                      </button>
                    </div>
                    {authNote && (
                      <AlertBox
                        variant={authNote.startsWith("Signed in") ? "success" : "error"}
                        message={authNote}
                        onClose={() => setAuthNote("")}
                        className="mt-3"
                      />
                    )}
                  </div>
                </div>
              )}

              {mode === "register" && !user && (
                <div className="mt-4 rounded-xl border border-[#E8CFD2] bg-[#FCF8F3] p-3.5 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-[#332B2B]">
                        Create your IZHA Circle account
                      </p>
                      <p className="text-[12px] text-[#6f6565]">
                        Join for member privileges and smoother checkout.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthModal("register")}
                      className={`${solidBtn} w-full shrink-0 py-2.5 text-[12px] sm:w-auto`}
                    >
                      Open Registration Modal
                    </button>
                  </div>
                  <p className="mt-3 text-[12px] text-[#6f6565]">
                    Or enter a password in the delivery details form below to automatically register while placing your order.
                  </p>
                </div>
              )}

              {user && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#3f6a46]/20 bg-[#F4F9F4] p-3 text-[13px] text-[#3f6a46]">
                  <span className="flex min-w-0 items-center gap-2 break-words">
                    <UserCheck size={16} className="shrink-0" />
                    <span className="min-w-0 break-all">
                      Signed in as <strong>{user.name}</strong> ({user.email || user.phone})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUser(null)}
                    className="text-[12px] font-medium text-[#B20947] underline underline-offset-2"
                  >
                    Switch account
                  </button>
                </div>
              )}
            </section>

            {/* Billing & Delivery Details */}
            <section className={`${card} p-4 sm:p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B5607A]">
                    Step 2 · Billing &amp; Delivery Address
                  </p>
                  <h3 className={`${serif} mt-1 text-[20px] font-medium text-[#332B2B]`}>
                    {savedAddresses.length > 0 && selectedAddressId !== "new"
                      ? "Delivery Address"
                      : "Enter Delivery Address"}
                  </h3>
                </div>

                {savedAddresses.length > 0 && selectedAddressId !== "new" && (
                  <button
                    type="button"
                    onClick={handleAddNewAddress}
                    className={`${outlineBtn} w-full justify-center gap-1.5 py-1.5 text-[12px] sm:w-auto`}
                  >
                    <Plus size={14} /> Add New Address
                  </button>
                )}
              </div>

              {error && (
                <AlertBox
                  variant="error"
                  message={error}
                  onClose={() => setError("")}
                  className="mt-4"
                />
              )}

              {/* Saved addresses selector if customer has saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6f6565]">
                      Saved Addresses in Profile ({savedAddresses.length})
                    </span>
                    {selectedAddressId === "new" && (
                      <button
                        type="button"
                        onClick={handleBackToSaved}
                        className="text-[12px] font-medium text-[#B20947] underline underline-offset-4"
                      >
                        ← Deliver to a saved address
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`relative min-w-0 cursor-pointer rounded-xl border p-3.5 text-[13px] transition-all sm:p-4 ${
                            isSelected
                              ? "border-[#B20947] bg-[#FFF5F7] ring-1 ring-[#B20947]/30 shadow-xs"
                              : "border-[#E8CFD2] bg-[#FCF8F3] hover:border-[#E8B8C5] hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-[#E99A9F] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                              {addr.label || "Home"}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[11px] font-medium text-[#B20947]">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-2 break-words font-semibold text-[#332B2B]">
                            {addr.name || name || user?.name || "Recipient"}
                          </p>
                          <p className="mt-0.5 line-clamp-2 break-words text-[#6f6565]">{addr.line}</p>
                          <p className="mt-0.5 text-[#6f6565]">
                            {addr.city} - {addr.pincode}
                          </p>
                          {addr.phone && (
                            <p className="mt-1 text-[12px] text-[#8F3057]">+91 {addr.phone}</p>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="radio"
                              name="selectedSavedAddress"
                              checked={isSelected}
                              onChange={() => handleSelectSavedAddress(addr)}
                              className="h-4 w-4 border-[#E8B8C5] text-[#B20947] accent-[#B20947]"
                            />
                            <span
                              className={`text-[12px] font-medium ${
                                isSelected ? "text-[#B20947] font-semibold" : "text-[#6f6565]"
                              }`}
                            >
                              {isSelected ? "Delivering here" : "Deliver to this address"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Address Form: shown if selectedAddressId === "new" OR if customer has no saved addresses */}
              {(selectedAddressId === "new" || savedAddresses.length === 0) && (
                <div
                  className={`${
                    savedAddresses.length > 0
                      ? "mt-5 rounded-xl border border-[#E8CFD2] bg-[#FFF9F4] p-3.5 sm:p-5"
                      : "mt-4"
                  }`}
                >
                  {savedAddresses.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8CFD2] pb-3">
                      <div>
                        <p className="text-[14px] font-semibold text-[#332B2B]">
                          Deliver to a Different Address
                        </p>
                        <p className="text-[12px] text-[#6f6565]">
                          Send this order to another place, family member, or friend.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(["Home", "Work", "Other"] as const).map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setNewAddressLabel(lbl)}
                            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                              newAddressLabel === lbl
                                ? "bg-[#B20947] text-white"
                                : "border border-[#E8B8C5] bg-white text-[#332B2B]"
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
                        Full Name *
                      </span>
                      <input
                        className={inputCls}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Recipient full name"
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
                        Mobile Number *
                      </span>
                      <div className="flex">
                        <span className="flex items-center rounded-l-[10px] border border-r-0 border-[#E8B8C5] bg-[#FFF5F7] px-3 text-[14px] text-[#6f6565]">
                          +91
                        </span>
                        <input
                          className={`${inputCls} min-w-0 !rounded-l-none`}
                          value={phone}
                          maxLength={10}
                          inputMode="tel"
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="10 digit mobile"
                        />
                      </div>
                    </label>

                    <label className="block min-w-0 sm:col-span-2">
                      <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
                        Email Address {mode === "register" ? "*" : "(for order updates)"}
                      </span>
                      <input
                        className={inputCls}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>

                    {mode === "register" && !user && (
                      <label className="block min-w-0 sm:col-span-2">
                        <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
                          Create Account Password *
                        </span>
                        <input
                          className={inputCls}
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                        />
                      </label>
                    )}

                    <label className="block min-w-0 sm:col-span-2">
                      <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
                        House Name / Flat / Street Address *
                      </span>
                      <input
                        className={inputCls}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House name, building, street & landmark"
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
                        Town / City *
                      </span>
                      <input
                        className={inputCls}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Aluva / Kochi / Bengaluru"
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-[13px] font-medium text-[#332B2B]">
                        State *
                      </span>
                      <input
                        className={inputCls}
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="Kerala"
                      />
                    </label>
                  </div>

                  {/* Save to Profile Checkbox - TICKED IN DEFAULT */}
                  <div className="mt-4 rounded-xl border border-[#E8CFD2] bg-[#FFF5F7] p-3.5">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={saveAddressToProfile}
                        onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                        className="h-4 w-4 shrink-0 rounded border-[#E8B8C5] text-[#B20947] accent-[#B20947] focus:ring-[#B20947]"
                      />
                      <div>
                        <span className="text-[13px] font-medium text-[#332B2B]">
                          Save this address to my profile
                        </span>
                        <p className="text-[11px] text-[#6f6565]">
                          Address will automatically save to your profile for future orders.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Delivery PIN Code Checker */}
              <div className="mt-5 rounded-xl border border-[#E8CFD2] bg-[#FCF8F3] p-3.5 sm:p-4">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#332B2B]">
                  <MapPin size={15} className="shrink-0 text-[#B20947]" />
                  Delivery PIN Code Check (India)
                </span>
                <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <input
                    className={`${inputCls} w-full sm:max-w-[200px]`}
                    value={pincode}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="6-digit PIN code"
                    onChange={(e) => {
                      setPincode(e.target.value.replace(/\D/g, ""));
                      setPinChecked(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCheckPincode}
                    className={`${outlineBtn} w-full justify-center sm:w-auto`}
                  >
                    Check Availability
                  </button>
                </div>
                {activePinCheck && (
                  <p
                    className={`mt-2.5 flex items-start gap-2 text-[13px] ${
                      activePinCheck.serviceable ? "text-[#3f6a46]" : "text-[#B20947]"
                    }`}
                  >
                    <Truck size={15} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 break-words">{activePinCheck.message}</span>
                  </p>
                )}
              </div>
            </section>

            {/* Payment Method */}
            <section className={`${card} p-4 sm:p-6`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B5607A]">
                Step 3 · Payment Method
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {[
                  { id: "Razorpay" as const, label: "Razorpay (Cards, UPI, NetBanking)" },
                  { id: "Cash on Delivery" as const, label: "Cash on Delivery" },
                ].map((method) => {
                  const active =
                    paymentMethod === method.id ||
                    (method.id === "Razorpay" && (paymentMethod as string) === "UPI");
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left text-[14px] font-medium transition-colors ${focusRing} ${
                        active
                          ? "border-[#B20947] bg-[#FFF5F7] text-[#B20947]"
                          : "border-[#E8CFD2] bg-[#FCF8F3] text-[#332B2B]"
                      }`}
                    >
                      <CreditCard size={17} className="shrink-0" />
                      {method.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className={`${card} relative px-4 pb-5 pt-9 sm:px-6 sm:pb-6`}>
              <FlowerBadge />
              <h2 className={`${serif} text-center text-[24px] font-medium text-[#332B2B] sm:text-[26px]`}>
                Order Summary
              </h2>
              <span className="mx-auto mt-2 block h-[2px] w-14 bg-[#E8B8C5]" />

              {/* Bag Items with quick qty updates */}
              <ul className="mt-5 divide-y divide-[#E8CFD2]">
                {cart.map((item) => {
                  const prod = adminProducts.find((p) => String(p.id) === String(item.id) || p.name === item.name);
                  const itemStock = prod !== undefined ? Number(prod.stock) : 999;
                  const isOutOfStock = itemStock === 0;
                  const exceedsStock = item.qty > itemStock;
                  const displayImg =
                    (item.image && item.image !== "/images/about.jpg" ? item.image : null) ||
                    prod?.image ||
                    item.image ||
                    "/images/about.jpg";

                  return (
                    <li key={`${item.id}-${item.size}`} className="flex flex-col py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/product/${encodeURIComponent(item.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative h-14 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[#E8B8C5] bg-[#FFF5F7] transition-transform hover:scale-105"
                          title="Click to view full product details page"
                        >
                          <Image
                            src={displayImg}
                            alt={item.name}
                            fill
                            sizes="48px"
                            quality={75}
                            unoptimized={Boolean(item.image?.startsWith("data:"))}
                            className="object-cover"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/product/${encodeURIComponent(item.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block text-left cursor-pointer"
                            title="Click to view full product details page"
                          >
                            <p className="line-clamp-1 text-[13px] font-medium text-[#332B2B] group-hover:text-[#B20947] transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[12px] text-[#6f6565]">
                              Size {item.size} · {inr(item.price)}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B20947] opacity-80 group-hover:opacity-100">
                              <Eye size={11} /> View product page
                            </span>
                          </Link>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => changeQty(item.id, item.size, -1)}
                              disabled={item.qty <= 1}
                              aria-label="Decrease quantity"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E8B8C5] text-[#332B2B] disabled:opacity-40 sm:h-6 sm:w-6"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-[12px] font-medium">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => changeQty(item.id, item.size, 1)}
                              disabled={item.qty >= itemStock || item.qty >= 10}
                              aria-label="Increase quantity"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E8B8C5] text-[#332B2B] disabled:opacity-40 sm:h-6 sm:w-6"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <span className="shrink-0 text-[13px] font-semibold text-[#332B2B]">
                          {inr(item.price * item.qty)}
                        </span>
                      </div>
                      {(isOutOfStock || exceedsStock) && (
                        <p className="mt-1.5 text-[11px] font-medium text-[#B20947]">
                          {isOutOfStock
                            ? "Sorry! This product is currently out of stock."
                            : `Only ${itemStock} units are available. Please update your quantity to continue.`}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Coupon Code Section */}
              <div className="mt-4 border-t border-[#E8CFD2] pt-4">
                <label className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#332B2B]">
                  <Tag size={14} className="text-[#B20947]" />
                  Apply Coupon Code
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    className={`${inputCls} min-w-0 flex-1 !py-2.5 text-[13px] uppercase`}
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter Coupon Code (e.g. FESTIVE20)"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon}
                    className={`${outlineBtn} shrink-0 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {isValidatingCoupon ? "Checking..." : "Apply"}
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-[#f0f7f1] px-3 py-1.5 text-[12px] text-[#3f6a46]">
                    <span>
                      Code <strong>{appliedCoupon.code}</strong> active
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponMsg(null);
                      }}
                      aria-label="Remove coupon"
                      className="p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {couponMsg && (
                  <AlertBox
                    variant={couponMsg.ok ? "success" : "error"}
                    message={couponMsg.text}
                    onClose={() => setCouponMsg(null)}
                    className="mt-2.5"
                  />
                )}
              </div>

              {/* Price Breakdown */}
              <dl className="mt-5 space-y-2.5 border-t border-[#E8CFD2] pt-4 text-[13px] sm:text-[14px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6f6565]">Subtotal ({totalQty} items)</dt>
                  <dd className="shrink-0 font-medium text-[#332B2B]">{inr(subtotal)}</dd>
                </div>
                {productSavings > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#6f6565]">MRP Savings</dt>
                    <dd className="shrink-0 font-medium text-[#5f7a62]">−{inr(productSavings)}</dd>
                  </div>
                )}
                {comboDiscount > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#6f6565]">{offers.comboTitle}</dt>
                    <dd className="shrink-0 font-medium text-[#5f7a62]">−{inr(comboDiscount)}</dd>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#6f6565]">Coupon ({appliedCoupon?.code})</dt>
                    <dd className="shrink-0 font-medium text-[#5f7a62]">−{inr(couponDiscount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6f6565]">
                    Delivery {activeDeliveryInfo.regionName ? `(${activeDeliveryInfo.regionName})` : ""}
                  </dt>
                  <dd className="shrink-0 font-medium text-[#332B2B]">
                    {activeDeliveryInfo.isFreeDelivery ? (
                      <span className="font-semibold text-[#3f6a46]">FREE</span>
                    ) : (
                      inr(shippingCost)
                    )}
                  </dd>
                </div>

                {/* Dynamic Free Delivery Notification based on Admin Rules */}
                {activeDeliveryInfo.amountNeededForFreeDelivery > 0 && activeDeliveryInfo.isEligibleForFreeDelivery && (
                  <div className="rounded-lg border border-[#E99A9F]/60 bg-[#FFF5F7] p-2.5 text-center text-[12px] font-medium text-[#B20947]">
                    Add {inr(activeDeliveryInfo.amountNeededForFreeDelivery)} more to qualify for free delivery.
                  </div>
                )}
                {activeDeliveryInfo.isFreeDelivery && activeDeliveryInfo.isEligibleForFreeDelivery && (
                  <div className="rounded-lg border border-[#c4e2c9] bg-[#f0f7f1] p-2.5 text-center text-[12px] font-medium text-[#3f6a46]">
                    ✓ Free delivery unlocked on this order!
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3 border-t border-[#E8CFD2] pt-3">
                  <dt className={`${serif} text-[20px] font-semibold text-[#332B2B] sm:text-[22px]`}>
                    Final Payable
                  </dt>
                  <dd className={`${serif} text-[24px] font-semibold text-[#B20947] sm:text-[26px]`}>
                    {inr(finalPayable)}
                  </dd>
                </div>
              </dl>

              {(() => {
                const hasStockIssue = cart.some((item) => {
                  const prod = adminProducts.find((p) => String(p.id) === String(item.id));
                  if (!prod) return false;
                  return prod.stock <= 0 || item.qty > prod.stock;
                });
                return (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting || hasStockIssue}
                      onClick={handlePlaceOrder}
                      className={`${solidBtn} mt-5 w-full disabled:opacity-50`}
                    >
                      {isSubmitting
                        ? "Processing..."
                        : paymentMethod === "Cash on Delivery"
                        ? `Place Order (COD) · ${inr(finalPayable)}`
                        : `Pay with Razorpay · ${inr(finalPayable)}`}
                    </button>
                    {error && (
                      <AlertBox
                        variant="error"
                        message={error}
                        onClose={() => setError("")}
                        className="mt-3"
                      />
                    )}
                  </>
                );
              })()}

              <div className={`${cardCream} mt-4 flex items-center justify-between gap-2 px-3.5 py-2.5 text-[12px] text-[#6f6565]`}>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="shrink-0 text-[#B20947]" />
                  Safe &amp; Secure Checkout
                </span>
                <a
                  href={`https://wa.me/919995757612?text=${encodeURIComponent(
                    "Hi IZHA BLOOMS! I'm interested in your collection. Could you please assist me?"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 font-medium text-[#B20947] hover:underline"
                >
                  <WhatsAppSvg size={14} />
                  Help
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}

      {authModal && (
        <AuthModal
          initialMode={authModal}
          onDone={(u) => {
            setUser(u);
            if (u.name) setName(u.name);
            if (u.email) setEmail(u.email);
            if (u.phone) setPhone(u.phone);
            setMode(authModal === "register" ? "register" : "signin");
            setAuthModal(null);
          }}
          onClose={() => setAuthModal(null)}
        />
      )}
    </PageShell>
  );
}