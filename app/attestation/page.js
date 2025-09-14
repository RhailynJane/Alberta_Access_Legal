import { AttestationForm } from "../../components/AttestationForm";

export default function AttestationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Professional Attestation
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Lawyers must complete this professional attestation to verify their credentials 
            and standing with the Law Society of Alberta.
          </p>
        </div>
        
        <AttestationForm />
      </div>
    </div>
  );
}