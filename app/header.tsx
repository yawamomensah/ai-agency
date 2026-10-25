import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", padding: 20 }}>
      <h1>My App</h1>
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton />
      </Show>
    </header>
  );
}