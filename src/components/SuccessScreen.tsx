import React from "react";
import { useDispatch } from "react-redux";
import { logout } from "../store/authSlice";

const SuccessScreen: React.FC = () => {
  const dispatch = useDispatch();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Connected to Xero</h1>
        <p className="mt-2 text-sm text-gray-600">
          You are authenticated (demo)
        </p>
        <button
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600"
          onClick={() => dispatch(logout())}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default SuccessScreen;
