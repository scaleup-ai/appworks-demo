import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getXeroAuthUrl } from "../../apis/xero.api";
import handleXeroRedirect from "../../utils/xeroRedirectHandler";
import { AppDispatch } from "../../store/store";

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    void handleXeroRedirect(dispatch as any);
  }, [dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = getXeroAuthUrl();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Sign in to Xero</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your Xero account
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-lg border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Sign in to Xero
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
