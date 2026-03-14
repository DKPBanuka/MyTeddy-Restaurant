import React, { useState } from 'react';
import { useSettings, type RestaurantSettings } from '../context/SettingsContext';
import { Save, Building, CreditCard, Receipt, Wifi, Phone, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const { settings, isLoading, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'receipt'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = React.useState<Partial<RestaurantSettings>>(settings || {});


  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<RestaurantSettings>) => ({
      ...prev,
      [name]: name.includes('Rate') || name.includes('Charge') ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings(formData);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Global Settings</h1>
          <p className="text-slate-500 font-medium">Configure restaurant profile and business logic</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-4 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          General Profile
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'billing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Billing & Taxes
        </button>
        <button
          onClick={() => setActiveTab('receipt')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'receipt' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Receipt Customization
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Restaurant Name</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    name="restaurantName"
                    value={formData.restaurantName || ''}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-400" size={20} />
                  <textarea
                    name="address"
                    rows={3}
                    value={formData.address || ''}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium resize-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Logo URL</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    name="logoUrl"
                    value={formData.logoUrl || ''}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Tax Rate (%)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                  <input
                    type="number"
                    name="taxRate"
                    step="0.01"
                    value={formData.taxRate || 0}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Service Charge (%)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                  <input
                    type="number"
                    name="serviceCharge"
                    step="0.01"
                    value={formData.serviceCharge || 0}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Packaging Fee (Rs.)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="number"
                    name="packagingCharge"
                    step="0.01"
                    value={formData.packagingCharge || 0}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Currency Symbol</label>
                <input
                  type="text"
                  name="currencySymbol"
                  value={formData.currencySymbol || 'Rs.'}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receipt' && (
          <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Receipt Footer Message</label>
                <div className="relative">
                  <Receipt className="absolute left-4 top-4 text-slate-400" size={20} />
                  <textarea
                    name="receiptFooter"
                    rows={3}
                    value={formData.receiptFooter || ''}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium resize-none"
                    placeholder="e.g. Thank you for dining with us!"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Wi-Fi Password</label>
                <div className="relative">
                  <Wifi className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    name="wifiPassword"
                    value={formData.wifiPassword || ''}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">QR Code URL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">QR</span>
                  <input
                    type="text"
                    name="qrCodeUrl"
                    value={formData.qrCodeUrl || ''}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all font-medium"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
