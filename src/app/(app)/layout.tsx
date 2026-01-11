import AppShellClient from "./AppShellClient";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShellClient>{children}</AppShellClient>;
}
