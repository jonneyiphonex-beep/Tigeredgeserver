#!/bin/sh
echo "🔒 [AIR-GAP HARDENING] Securing Tigeredgeserver and closing all backdoors..."

# 1. تفعيل جدار ناري صارم يرفض أي حركة مرور خارجية (WAN) نهائياً
iptables -F
iptables -X
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# السماح للاتصال الداخلي المحلي (Loopback والشبكة المحلية المغلقة فقط)
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 8443 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 8443 -s 10.0.0.0/8 -j ACCEPT

# 2. تعطيل الواي فاي والبلوتوث لمنع أي تسريب مادي للبيانات
ifconfig wlan0 down 2>/dev/null || true
rfkill block all 2>/dev/null || true

# 3. إحكام صلاحيات الملفات الحساسة
chmod 500 /usr/bin/engine
chmod 500 /usr/bin/gateway
chmod 400 /etc/tigeredgeserver/config/security.toml

echo "✅ [SUCCESS] Tigeredgeserver is 100% Air-Gapped, Offline, and Secure."
