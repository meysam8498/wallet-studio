import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LedgerMark } from "@/components/LedgerMark";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col items-center justify-center bg-background p-6"
    >
      <LedgerMark className="size-10 text-muted-foreground" />
      <h1 className="mt-6 font-display text-5xl">۴۰۴</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        این تابلو در گالری نیست.
      </p>
      <Button className="mt-8" variant="outline" onClick={() => (window.location.href = "/")}>
        بازگشت به خانه
      </Button>
    </motion.div>
  );
}
