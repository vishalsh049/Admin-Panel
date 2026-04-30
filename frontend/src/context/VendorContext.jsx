import { createContext, useContext, useState, useEffect } from "react";

const VendorContext = createContext();

export function VendorProvider({ children }) {

  const [vendors, setVendors] = useState(() => {
    const savedVendors = localStorage.getItem("vendors");
    return savedVendors ? JSON.parse(savedVendors) : [];
  });

  useEffect(() => {
    localStorage.setItem("vendors", JSON.stringify(vendors));
  }, [vendors]);

  // ADD VENDOR
  const addVendor = (vendorData) => {
    const newVendor = {
      id: Date.now().toString(),
      ...vendorData,
    };

    setVendors((prev) => [...prev, newVendor]);
  };

  // UPDATE VENDOR
  const updateVendor = (id, updatedData) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updatedData } : v))
    );
  };

  // GET SINGLE VENDOR
  const getVendorById = (id) => {
    return vendors.find((v) => v.id === id);
  };

  return (
    <VendorContext.Provider
      value={{
        vendors,
        addVendor,
        updateVendor,
        getVendorById,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
}

export function useVendors() {
  return useContext(VendorContext);
}