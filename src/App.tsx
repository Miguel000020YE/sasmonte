import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AdminRoute, ProtectedRoute, PublicOnly } from '@/components/layout/Guards';
import { Account } from '@/pages/Account';
import { BuyCredits } from '@/pages/BuyCredits';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { MyVideos } from '@/pages/MyVideos';
import { NotFound } from '@/pages/NotFound';
import { PaymentReturn } from '@/pages/PaymentReturn';
import { ResetPassword } from '@/pages/ResetPassword';
import { Signup } from '@/pages/Signup';
import { Studio } from '@/pages/Studio';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminPacks } from '@/pages/admin/AdminPacks';
import { AdminPayments } from '@/pages/admin/AdminPayments';
import { AdminQuotas } from '@/pages/admin/AdminQuotas';
import { AdminUsers } from '@/pages/admin/AdminUsers';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<PublicOnly />}>
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Signup />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
      </Route>
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/studio" element={<Studio />} />
          <Route path="/mes-videos" element={<MyVideos />} />
          <Route path="/acheter" element={<BuyCredits />} />
          <Route path="/paiement/retour" element={<PaymentReturn />} />
          <Route path="/compte" element={<Account />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="quotas" element={<AdminQuotas />} />
              <Route path="utilisateurs" element={<AdminUsers />} />
              <Route path="packs" element={<AdminPacks />} />
              <Route path="paiements" element={<AdminPayments />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
