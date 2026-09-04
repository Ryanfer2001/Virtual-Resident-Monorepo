// Hostinger's Node.js hosting only deploys the "Root directory" (apps/web) at
// runtime, without the rest of the pnpm workspace. pnpm's default linker
// installs deps as symlinks into ../../node_modules/.pnpm at the workspace
// root, so once apps/web is deployed on its own those symlinks dangle and
// `require('next')` fails at runtime even though the build itself succeeds.
// This walks node_modules after the build and replaces every symlink with a
// real copy of its target, making apps/web/node_modules self-contained.
const fs = require("fs");
const path = require("path");

function dereferenceSymlinks(dir, seen) {
  if (seen.has(dir)) return;
  seen.add(dir);

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      let real;
      try {
        real = fs.realpathSync(fullPath);
      } catch {
        continue; // broken symlink, nothing to recover
      }
      fs.rmSync(fullPath, { recursive: true, force: true });
      fs.cpSync(real, fullPath, { recursive: true, dereference: true });
      dereferenceSymlinks(fullPath, seen);
    } else if (entry.isDirectory()) {
      dereferenceSymlinks(fullPath, seen);
    }
  }
}

const target = path.join(__dirname, "..", "node_modules");
if (fs.existsSync(target)) {
  dereferenceSymlinks(target, new Set());
  console.log("node_modules symlinks dereferenced for deployment.");
}
