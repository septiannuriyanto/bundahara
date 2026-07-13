import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword,
  onAuthStateChanged
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { auth, db, isMockMode } from "./firebase";

// --- INTERFACES ---
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  createdAt: number;
}

export interface BalanceSheet {
  id: string;
  organizationId: string;
  branchId: string;
  type: 'income' | 'expense';
  amount: number;
  date: number; // timestamp ms
  pic: string;
  description?: string;
  proofOfPayment: string; // base64 string or url
  createdAt: number;
}

export interface AnalyticsSummary {
  monthly: { month: string; income: number; expense: number }[];
  byPic: { pic: string; income: number; expense: number }[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

// --- MOCK DATABASE (LOCAL STORAGE) ---
const mockLocalStorageKey = (key: string) => `bundahara_mock_${key}`;

const getMockData = <T>(key: string, defaultVal: T): T => {
  const data = localStorage.getItem(mockLocalStorageKey(key));
  return data ? JSON.parse(data) : defaultVal;
};

const setMockData = <T>(key: string, data: T) => {
  localStorage.setItem(mockLocalStorageKey(key), JSON.stringify(data));
};

// Initialize mock database values if empty
if (isMockMode) {
  if (!getMockData("users", null)) {
    setMockData("users", [
      { uid: "mock-user-1", email: "bendahara@example.com", displayName: "Bendahara Utama" }
    ]);
  }
  if (!getMockData("organizations", null)) {
    setMockData("organizations", [
      { id: "org-1", name: "Kelas XII MIPA 1", ownerId: "mock-user-1", createdAt: Date.now() - 1000000 }
    ]);
  }
  if (!getMockData("branches", null)) {
    setMockData("branches", [
      { id: "branch-1", organizationId: "org-1", name: "PUSAT", createdAt: Date.now() - 900000 },
      { id: "branch-2", organizationId: "org-1", name: "Uang Kas Sosial", createdAt: Date.now() - 800000 }
    ]);
  }
  if (!getMockData("balance_sheets", null)) {
    const now = Date.now();
    setMockData("balance_sheets", [
      {
        id: "tx-1",
        organizationId: "org-1",
        branchId: "branch-1",
        type: "income",
        amount: 500000,
        date: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        pic: "Budi",
        description: "Uang kas bulanan Juli",
        createdAt: now - 30 * 24 * 60 * 60 * 1000
      },
      {
        id: "tx-2",
        organizationId: "org-1",
        branchId: "branch-1",
        type: "expense",
        amount: 150000,
        date: now - 15 * 24 * 60 * 60 * 1000, // 15 days ago
        pic: "Siti",
        description: "Beli sapu dan kemoceng kelas",
        createdAt: now - 15 * 24 * 60 * 60 * 1000
      },
      {
        id: "tx-3",
        organizationId: "org-1",
        branchId: "branch-1",
        type: "income",
        amount: 250000,
        date: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        pic: "Budi",
        description: "Donasi alumni",
        createdAt: now - 2 * 24 * 60 * 60 * 1000
      },
      {
        id: "tx-4",
        organizationId: "org-1",
        branchId: "branch-2",
        type: "income",
        amount: 100000,
        date: now - 10 * 24 * 60 * 60 * 1000,
        pic: "Rian",
        description: "Uang kas sosial",
        createdAt: now - 10 * 24 * 60 * 60 * 1000
      }
    ]);
  }
}

let mockCurrentUser: UserProfile | null = getMockData<UserProfile | null>("currentUser", null);

// --- DB SERVICE EXPORTS ---
export const dbService = {
  // --- AUTHENTICATION ---
  onAuthChange: (callback: (user: UserProfile | null) => void) => {
    if (isMockMode) {
      // Simulate auth change listener
      const interval = setInterval(() => {
        const current = getMockData<UserProfile | null>("currentUser", null);
        if (JSON.stringify(current) !== JSON.stringify(mockCurrentUser)) {
          mockCurrentUser = current;
          callback(mockCurrentUser);
        }
      }, 500);
      callback(mockCurrentUser);
      return () => clearInterval(interval);
    } else {
      return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const userData = userDoc.data();
          callback({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: userData?.displayName || firebaseUser.displayName || "Bendahara"
          });
        } else {
          callback(null);
        }
      });
    }
  },

  getCurrentUser: (): UserProfile | null => {
    if (isMockMode) {
      return getMockData<UserProfile | null>("currentUser", null);
    } else {
      const user = auth?.currentUser;
      if (!user) return null;
      return {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Bendahara"
      };
    }
  },

  register: async (email: string, password: string, displayName: string): Promise<UserProfile> => {
    if (isMockMode) {
      const users = getMockData<any[]>("users", []);
      if (users.find(u => u.email === email)) {
        throw new Error("Email sudah terdaftar.");
      }
      const newUid = `user-${Date.now()}`;
      const newUser = { uid: newUid, email, displayName };
      users.push(newUser);
      setMockData("users", users);
      setMockData("currentUser", newUser);
      mockCurrentUser = newUser;
      return newUser;
    } else {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = {
        uid: credential.user.uid,
        email: credential.user.email || email,
        displayName
      };
      await setDoc(doc(db, "users", credential.user.uid), {
        email: newUser.email,
        displayName: newUser.displayName,
        createdAt: Timestamp.now()
      });
      return newUser;
    }
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    if (isMockMode) {
      const users = getMockData<any[]>("users", []);
      // Auto register default email if doesn't exist for easy testing
      let user = users.find(u => u.email === email);
      if (!user) {
        if (email === "bendahara@example.com") {
          user = { uid: "mock-user-1", email, displayName: "Bendahara Utama" };
          users.push(user);
          setMockData("users", users);
        } else {
          throw new Error("Email atau password salah.");
        }
      }
      setMockData("currentUser", user);
      mockCurrentUser = user;
      return user;
    } else {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", credential.user.uid));
      const userData = userDoc.data();
      return {
        uid: credential.user.uid,
        email: credential.user.email || email,
        displayName: userData?.displayName || credential.user.displayName || "Bendahara"
      };
    }
  },

  logout: async (): Promise<void> => {
    if (isMockMode) {
      setMockData("currentUser", null);
      mockCurrentUser = null;
    } else {
      await signOut(auth);
    }
  },

  updateProfile: async (displayName: string): Promise<void> => {
    const user = dbService.getCurrentUser();
    if (!user) throw new Error("Pengguna tidak terautentikasi.");

    if (isMockMode) {
      const users = getMockData<any[]>("users", []);
      const updatedUsers = users.map(u => u.uid === user.uid ? { ...u, displayName } : u);
      setMockData("users", updatedUsers);
      const updatedUser = { ...user, displayName };
      setMockData("currentUser", updatedUser);
      mockCurrentUser = updatedUser;
    } else {
      await updateDoc(doc(db, "users", user.uid), { displayName });
    }
  },

  changePassword: async (password: string): Promise<void> => {
    if (isMockMode) {
      // Direct success for mock
      return Promise.resolve();
    } else {
      const user = auth.currentUser;
      if (!user) throw new Error("Pengguna tidak terautentikasi.");
      await updatePassword(user, password);
    }
  },

  // --- ORGANIZATIONS ---
  getOrganizations: async (): Promise<Organization[]> => {
    const user = dbService.getCurrentUser();
    if (!user) return [];

    if (isMockMode) {
      const orgs = getMockData<Organization[]>("organizations", []);
      return orgs.filter(o => o.ownerId === user.uid);
    } else {
      const q = query(
        collection(db, "organizations"), 
        where("ownerId", "==", user.uid),
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    }
  },

  addOrganization: async (name: string, defaultBranchName: string = "PUSAT"): Promise<Organization> => {
    const user = dbService.getCurrentUser();
    if (!user) throw new Error("Pengguna tidak terautentikasi.");

    if (isMockMode) {
      const orgs = getMockData<Organization[]>("organizations", []);
      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name,
        ownerId: user.uid,
        createdAt: Date.now()
      };
      orgs.push(newOrg);
      setMockData("organizations", orgs);

      // Create default branch
      await dbService.addBranch(newOrg.id, defaultBranchName || "PUSAT");

      return newOrg;
    } else {
      const newDocRef = doc(collection(db, "organizations"));
      const newOrg = {
        id: newDocRef.id,
        name,
        ownerId: user.uid,
        createdAt: Date.now()
      };
      await setDoc(newDocRef, newOrg);
      await dbService.addBranch(newDocRef.id, defaultBranchName || "PUSAT");
      return newOrg;
    }
  },

  // --- BRANCHES ---
  getBranches: async (organizationId: string): Promise<Branch[]> => {
    if (isMockMode) {
      const branches = getMockData<Branch[]>("branches", []);
      return branches.filter(b => b.organizationId === organizationId);
    } else {
      const q = query(
        collection(db, "branches"), 
        where("organizationId", "==", organizationId),
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
    }
  },

  addBranch: async (organizationId: string, name: string): Promise<Branch> => {
    if (isMockMode) {
      const branches = getMockData<Branch[]>("branches", []);
      const newBranch: Branch = {
        id: `branch-${Date.now()}`,
        organizationId,
        name: name.trim() ? name : "PUSAT",
        createdAt: Date.now()
      };
      branches.push(newBranch);
      setMockData("branches", branches);
      return newBranch;
    } else {
      const newDocRef = doc(collection(db, "branches"));
      const newBranch = {
        id: newDocRef.id,
        organizationId,
        name: name.trim() ? name : "PUSAT",
        createdAt: Date.now()
      };
      await setDoc(newDocRef, newBranch);
      return newBranch;
    }
  },

  // --- BALANCE SHEETS (TRANSACTIONS) ---
  getTransactions: async (organizationId: string, branchId: string): Promise<BalanceSheet[]> => {
    if (isMockMode) {
      const txs = getMockData<BalanceSheet[]>("balance_sheets", []);
      return txs
        .filter(t => t.organizationId === organizationId && t.branchId === branchId)
        .sort((a, b) => b.date - a.date); // Newest first
    } else {
      const q = query(
        collection(db, "balance_sheets"),
        where("organizationId", "==", organizationId),
        where("branchId", "==", branchId),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BalanceSheet));
    }
  },

  addTransaction: async (
    organizationId: string,
    branchId: string,
    type: 'income' | 'expense',
    amount: number,
    date: number,
    pic: string,
    description: string,
    proofOfPayment: string
  ): Promise<BalanceSheet> => {
    if (isMockMode) {
      const txs = getMockData<BalanceSheet[]>("balance_sheets", []);
      const newTx: BalanceSheet = {
        id: `tx-${Date.now()}`,
        organizationId,
        branchId,
        type,
        amount,
        date,
        pic,
        description,
        proofOfPayment,
        createdAt: Date.now()
      };
      txs.push(newTx);
      setMockData("balance_sheets", txs);
      return newTx;
    } else {
      const newDocRef = doc(collection(db, "balance_sheets"));
      const newTx = {
        id: newDocRef.id,
        organizationId,
        branchId,
        type,
        amount,
        date,
        pic,
        description: description || "",
        proofOfPayment: proofOfPayment || "",
        createdAt: Date.now()
      };
      await setDoc(newDocRef, newTx);
      return newTx;
    }
  },

  updateTransaction: async (
    id: string,
    data: Partial<Omit<BalanceSheet, 'id' | 'organizationId' | 'branchId'>>
  ): Promise<void> => {
    if (isMockMode) {
      const txs = getMockData<BalanceSheet[]>("balance_sheets", []);
      const index = txs.findIndex(t => t.id === id);
      if (index !== -1) {
        txs[index] = { ...txs[index], ...data };
        setMockData("balance_sheets", txs);
      } else {
        throw new Error("Transaksi tidak ditemukan.");
      }
    } else {
      await updateDoc(doc(db, "balance_sheets", id), data);
    }
  },

  deleteTransaction: async (id: string): Promise<void> => {
    if (isMockMode) {
      const txs = getMockData<BalanceSheet[]>("balance_sheets", []);
      const updated = txs.filter(t => t.id !== id);
      setMockData("balance_sheets", updated);
    } else {
      await deleteDoc(doc(db, "balance_sheets", id));
    }
  },

  uploadProof: async (file: File): Promise<string> => {
    // Compress image to ~50KB and return base64 string directly
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Scale down image dimensions to maximum 600px width/height to easily meet ~50KB target
          const maxDimension = 600;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context is null"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Iterate quality to fit target size (~50KB)
          let quality = 0.7;
          let base64 = canvas.toDataURL("image/jpeg", quality);

          // Loop until estimated size is less than 50KB or quality drops below 0.15
          while (base64.length * 0.75 > 50 * 1024 && quality > 0.15) {
            quality -= 0.08;
            base64 = canvas.toDataURL("image/jpeg", quality);
          }

          resolve(base64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  },

  // --- ANALYTICS ---
  getAnalytics: async (organizationId: string, branchId: string): Promise<AnalyticsSummary> => {
    // Fetch all transactions for this org & branch
    const txs = await dbService.getTransactions(organizationId, branchId);

    let totalIncome = 0;
    let totalExpense = 0;
    
    // Group monthly
    const monthlyMap: Record<string, { income: number; expense: number }> = {};
    // Group by PIC
    const picMap: Record<string, { income: number; expense: number }> = {};

    txs.forEach(tx => {
      const amt = tx.amount;
      if (tx.type === "income") {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }

      // Monthly formatting: e.g. "Jul 2026"
      const dateObj = new Date(tx.date);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const monthStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

      if (!monthlyMap[monthStr]) {
        monthlyMap[monthStr] = { income: 0, expense: 0 };
      }
      if (tx.type === "income") {
        monthlyMap[monthStr].income += amt;
      } else {
        monthlyMap[monthStr].expense += amt;
      }

      // PIC formatting
      const picName = tx.pic.trim() || "Tanpa Nama";
      if (!picMap[picName]) {
        picMap[picName] = { income: 0, expense: 0 };
      }
      if (tx.type === "income") {
        picMap[picName].income += amt;
      } else {
        picMap[picName].expense += amt;
      }
    });

    // Convert monthly map to list and sort chronologically
    const monthly = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense
    })).reverse(); // Reverse if sorted descending initially, to display left-to-right (chronological) in charts.
    
    // Sort monthly correctly by parsing date keys
    monthly.sort((a, b) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const [aM, aY] = a.month.split(" ");
      const [bM, bY] = b.month.split(" ");
      const aDate = new Date(parseInt(aY), monthNames.indexOf(aM), 1);
      const bDate = new Date(parseInt(bY), monthNames.indexOf(bM), 1);
      return aDate.getTime() - bDate.getTime();
    });

    const byPic = Object.entries(picMap).map(([pic, data]) => ({
      pic,
      income: data.income,
      expense: data.expense
    })).sort((a, b) => (b.income + b.expense) - (a.income + a.expense)); // Descending by active volume

    return {
      monthly,
      byPic,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }
};
