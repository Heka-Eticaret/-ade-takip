import { createClient } from "@supabase/supabase-js";

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const loginDomain = process.env.NEXT_PUBLIC_LOGIN_DOMAIN || "iade.local";
const username = (getArg("username") || "").trim().toLowerCase();
const password = getArg("password") || "";
const fullName = (getArg("name") || username).trim();
const role = getArg("role") === "admin" ? "admin" : "operator";

if (!url || !serviceRoleKey) {
  console.error("Hata: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenlerini ekleyin.");
  process.exit(1);
}

if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
  console.error("Hata: Kullanıcı adı 3-30 karakter olmalı; yalnızca küçük harf, rakam, nokta, alt çizgi ve tire kullanılabilir.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Hata: Şifre en az 8 karakter olmalıdır.");
  process.exit(1);
}

const email = `${username}@${loginDomain}`;
const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listData, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("Kullanıcı listesi alınamadı:", listError.message);
  process.exit(1);
}

let user = listData.users.find((item) => item.email === email);

if (user) {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName, role },
  });

  if (error) {
    console.error("Kullanıcı güncellenemedi:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log(`Mevcut kullanıcı güncellendi: ${username}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName, role },
  });

  if (error || !data.user) {
    console.error("Kullanıcı oluşturulamadı:", error?.message || "Bilinmeyen hata");
    process.exit(1);
  }
  user = data.user;
  console.log(`Yeni kullanıcı oluşturuldu: ${username}`);
}

const { error: profileError } = await admin.from("profiles").upsert({
  id: user.id,
  username,
  full_name: fullName,
  role,
});

if (profileError) {
  console.error("Profil kaydedilemedi:", profileError.message);
  process.exit(1);
}

console.log(`Rol: ${role}`);
console.log("Kullanıcı giriş yapmaya hazır.");
