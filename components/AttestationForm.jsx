"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Authenticated, Unauthenticated } from "convex/react";
import { api } from "../convex/_generated/api";

export function AttestationForm() {
  const submitAttestation = useMutation(api.attestations.submitAttestation);
  const currentAttestation = useQuery(api.attestations.getMyAttestation);
  const attestationStatus = useQuery(api.attestations.checkMyAttestationStatus);

  const [formData, setFormData] = useState({
    legalName: "",
    barNumber: "",
    isLicensed: false,
    isInGoodStanding: false,
    noDisciplinaryActions: false,
    profileAccurate: false,
    willUpdateOnChange: false,
    understandsLiability: false,
    attestationText: "",
    attestationVersion: "1.0",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Pre-populate form with existing attestation data if available
  useState(() => {
    if (currentAttestation) {
      setFormData(prev => ({
        ...prev,
        legalName: currentAttestation.legalName || "",
        barNumber: currentAttestation.barNumber || "",
        isLicensed: currentAttestation.isLicensed || false,
        isInGoodStanding: currentAttestation.isInGoodStanding || false,
        noDisciplinaryActions: currentAttestation.noDisciplinaryActions || false,
        profileAccurate: currentAttestation.profileAccurate || false,
        willUpdateOnChange: currentAttestation.willUpdateOnChange || false,
        understandsLiability: currentAttestation.understandsLiability || false,
        attestationText: currentAttestation.attestationText || "",
        attestationVersion: currentAttestation.attestationVersion || "1.0",
      }));
    }
  }, [currentAttestation]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const result = await submitAttestation(formData);
      setSubmitSuccess(true);
      console.log("Attestation submitted:", result);
    } catch (error) {
      console.error("Attestation submission failed:", error);
      setSubmitError(error.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.legalName.trim() &&
      formData.barNumber.trim() &&
      formData.isLicensed &&
      formData.isInGoodStanding &&
      formData.noDisciplinaryActions &&
      formData.profileAccurate &&
      formData.willUpdateOnChange &&
      formData.understandsLiability
    );
  };

  return (
    <>
      <Unauthenticated>
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Lawyer Attestation
          </h2>
          <p className="text-gray-600 mb-4">
            Please sign in to continue with your professional attestation.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-800 text-sm">
              This attestation is required for lawyers to verify their professional standing 
              and credentials on the Access Alberta Legal platform.
            </p>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Professional Attestation
            </h2>
            {attestationStatus?.hasAttestation && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`inline-block w-3 h-3 rounded-full ${
                  attestationStatus.isValid ? 'bg-green-500' : 'bg-yellow-500'
                }`}></span>
                <span className="text-gray-600">
                  {attestationStatus.isValid ? 'Valid attestation' : 'Attestation needs updates'}
                </span>
                {attestationStatus.lsaVerified && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    LSA Verified
                  </span>
                )}
              </div>
            )}
          </div>

          {submitSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-6 text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-800 mb-2">
                Attestation Submitted Successfully
              </h3>
              <p className="text-green-600 mb-4">
                Your professional attestation has been recorded and will be verified against 
                the Law Society of Alberta directory.
              </p>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                View Attestation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Professional Information
                </h3>
                
                <div>
                  <label htmlFor="legalName" className="block text-sm font-medium text-gray-700 mb-1">
                    Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="legalName"
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => handleInputChange('legalName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full legal name as registered with LSA"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="barNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Law Society of Alberta Bar Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="barNumber"
                    type="text"
                    value={formData.barNumber}
                    onChange={(e) => handleInputChange('barNumber', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your LSA bar number"
                    pattern="[A-Z0-9]{4,10}"
                    title="Bar number must be 4-10 alphanumeric characters"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Format: 4-10 alphanumeric characters
                  </p>
                </div>
              </div>

              {/* Professional Standing Attestations */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Professional Standing Attestations
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please confirm the following statements are true and accurate:
                </p>

                {[
                  { key: 'isLicensed', label: 'I am currently licensed to practice law in Alberta' },
                  { key: 'isInGoodStanding', label: 'I am in good standing with the Law Society of Alberta' },
                  { key: 'noDisciplinaryActions', label: 'I have no pending or active disciplinary actions' },
                  { key: 'profileAccurate', label: 'The information in my profile is accurate and current' },
                  { key: 'willUpdateOnChange', label: 'I will promptly update my information if my status changes' },
                  { key: 'understandsLiability', label: 'I understand my professional liability and responsibilities on this platform' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData[key]}
                      onChange={(e) => handleInputChange(key, e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      required
                    />
                    <span className="text-sm text-gray-700 flex-1">{label}</span>
                  </label>
                ))}
              </div>

              {/* Platform Disclaimer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.5 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Platform Disclaimer</h4>
                    <p className="text-sm text-yellow-700">
                      <strong>Lawyer status is self-reported.</strong> Our platform does not independently 
                      verify practicing status beyond automated checks against the Law Society of Alberta directory. 
                      Users should confirm credentials with the official Law Society of Alberta if verification is required.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                {submitError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-red-700 text-sm">{submitError}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                    isFormValid() && !isSubmitting
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : currentAttestation ? 'Update Attestation' : 'Submit Attestation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Authenticated>
    </>
  );
}