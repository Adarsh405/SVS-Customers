import React, { Component } from "react";
import axios from "axios";
import {
  FiUser,
  FiPhone,
  FiMapPin,
  FiType,
  FiSave,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
} from "react-icons/fi";
import "./Customers.css";

const API_URL =
  "https://svs-jewellery-backend.onrender.com/api/customers";

const EMPTY_FORM = {
  customer_name: "",
  mobile_number: "",
  telugu_name: "",
  address: "",
};

class Customers extends Component {
  state = {
    form: { ...EMPTY_FORM },
    checking: false,
    saving: false,
    customerFound: false,
    lookupComplete: false,
    error: "",
    success: "",
  };

  lookupTimer = null;

  componentWillUnmount() {
    clearTimeout(this.lookupTimer);
  }

  handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "mobile_number") {
      const mobile = value.replace(/\D/g, "").slice(0, 10);

      clearTimeout(this.lookupTimer);

      this.setState(
        (prev) => ({
          form: {
            ...prev.form,
            mobile_number: mobile,
            ...(mobile.length !== 10
              ? {
                  customer_name: "",
                  telugu_name: "",
                  address: "",
                }
              : {}),
          },
          customerFound: false,
          lookupComplete: false,
          checking: false,
          error: "",
          success: "",
        }),
        () => {
          if (mobile.length === 10) {
            this.lookupTimer = setTimeout(
              () => this.fetchCustomer(mobile),
              350
            );
          }
        }
      );

      return;
    }

    this.setState((prev) => ({
      form: {
        ...prev.form,
        [name]: value,
      },
      error: "",
      success: "",
    }));
  };

  fetchCustomer = async (mobile) => {
    if (!/^[0-9]{10}$/.test(mobile)) return;

    this.setState({
      checking: true,
      lookupComplete: false,
      customerFound: false,
      error: "",
      success: "",
    });

    try {
      const response = await axios.get(
        `${API_URL}/mobile/${mobile}`
      );

      // Supports common API response formats:
      // { customer: {...} } or { success: true, customer: {...} }
      const customer =
        response.data?.customer ||
        response.data?.data?.customer ||
        response.data?.data ||
        response.data;

      if (
        !customer ||
        customer.success === false ||
        !customer.id
      ) {
        this.setState({
          checking: false,
          lookupComplete: true,
          customerFound: false,
          form: {
            ...EMPTY_FORM,
            mobile_number: mobile,
          },
        });
        return;
      }

      this.setState({
        checking: false,
        lookupComplete: true,
        customerFound: true,
        form: {
          customer_name: customer.customer_name || "",
          mobile_number: mobile,
          telugu_name: customer.telugu_name || "",
          address: customer.address || "",
        },
        editingCustomer: customer,
      });
    } catch (error) {
      if (error.response?.status === 404) {
        this.setState({
          checking: false,
          lookupComplete: true,
          customerFound: false,
          editingCustomer: null,
          form: {
            ...EMPTY_FORM,
            mobile_number: mobile,
          },
        });
        return;
      }

      console.error("Customer lookup error:", error);

      this.setState({
        checking: false,
        lookupComplete: false,
        error:
          error.response?.data?.message ||
          "Unable to check customer details. Please try again.",
      });
    }
  };

  handleSubmit = async (event) => {
    event.preventDefault();

    const {
      form,
      customerFound,
      editingCustomer,
      saving,
    } = this.state;

    if (saving) return;

    if (!/^[0-9]{10}$/.test(form.mobile_number)) {
      this.setState({
        error: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    if (!form.customer_name.trim()) {
      this.setState({
        error: "Please enter customer name.",
      });
      return;
    }

    const payload = {
      customer_name: form.customer_name.trim(),
      mobile_number: form.mobile_number,
      telugu_name: form.telugu_name.trim() || null,
      address: form.address.trim(),
    };

    this.setState({
      saving: true,
      error: "",
      success: "",
    });

    try {
      const response =
        customerFound && editingCustomer?.id
          ? await axios.put(
              `${API_URL}/${editingCustomer.id}`,
              payload
            )
          : await axios.post(API_URL, payload);

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message || "Unable to save customer."
        );
      }

      this.setState({
        saving: false,
        success: customerFound
          ? "Customer details updated successfully!"
          : "New customer added successfully!",
      });
    } catch (error) {
      console.error("Save customer error:", error);

      this.setState({
        saving: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Unable to save customer. Please try again.",
      });
    }
  };

  resetForm = () => {
    clearTimeout(this.lookupTimer);

    this.setState({
      form: { ...EMPTY_FORM },
      checking: false,
      saving: false,
      customerFound: false,
      lookupComplete: false,
      editingCustomer: null,
      error: "",
      success: "",
    });
  };

  render() {
    const {
      form,
      checking,
      saving,
      customerFound,
      lookupComplete,
      error,
      success,
    } = this.state;

    return (
      <main className="svs-customer-screen">
        <div className="svs-background-glow svs-glow-one" />
        <div className="svs-background-glow svs-glow-two" />

        <section className="svs-customer-card">
          {/* BRAND */}
          <header className="svs-form-header">
            <div className="svs-brand-logo">
              <span>SVS</span>
            </div>

            <div className="svs-brand-name">
              <h1>SVS JEWELLERY</h1>
              <p>Customer Registration</p>
            </div>

            <div className="svs-header-line" />
          </header>

          <div className="svs-form-heading">
            <span className="svs-heading-kicker">
              CUSTOMER INFORMATION
            </span>
            <h2>Welcome</h2>
            <p>
              Enter your mobile number to retrieve or register
              your details.
            </p>
          </div>

          <form onSubmit={this.handleSubmit}>
            {/* MOBILE NUMBER */}
            <div className="svs-field">
              <label htmlFor="mobile_number">
                <FiPhone />
                Mobile Number <b>*</b>
              </label>

              <div className="svs-input-wrap svs-mobile-wrap">
                <span className="svs-country-code">+91</span>

                <input
                  id="mobile_number"
                  type="tel"
                  name="mobile_number"
                  value={form.mobile_number}
                  onChange={this.handleChange}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                />

                {checking && (
                  <FiRefreshCw className="svs-input-spinner" />
                )}

                {!checking &&
                  lookupComplete &&
                  customerFound && (
                    <FiCheckCircle className="svs-input-success" />
                  )}

                {!checking &&
                  lookupComplete &&
                  !customerFound && (
                    <FiSearch className="svs-input-search" />
                  )}
              </div>

              <div className="svs-mobile-meta">
                <span>
                  {checking
                    ? "Checking customer records..."
                    : customerFound
                    ? "Existing customer found"
                    : lookupComplete
                    ? "New customer — please enter details"
                    : "Enter all 10 digits to search automatically"}
                </span>

                <strong>{form.mobile_number.length}/10</strong>
              </div>
            </div>

            {/* LOOKUP STATUS */}
            {checking && (
              <div className="svs-lookup-status">
                <div className="svs-mini-loader" />
                <span>Finding your customer details...</span>
              </div>
            )}

            {customerFound && lookupComplete && (
              <div className="svs-result-banner svs-found-banner">
                <FiCheckCircle />
                <span>
                  Customer found! You can modify the details below.
                </span>
              </div>
            )}

            {!customerFound && lookupComplete && !checking && (
              <div className="svs-result-banner svs-new-banner">
                <FiUser />
                <span>
                  New customer. Please fill in your details.
                </span>
              </div>
            )}

            {/* CUSTOMER NAME */}
            <div className="svs-field">
              <label htmlFor="customer_name">
                <FiUser />
                Customer Name <b>*</b>
              </label>

              <div className="svs-input-wrap">
                <FiUser className="svs-field-icon" />
                <input
                  id="customer_name"
                  type="text"
                  name="customer_name"
                  value={form.customer_name}
                  onChange={this.handleChange}
                  placeholder="Enter customer name"
                  maxLength={150}
                  autoComplete="name"
                  required
                  disabled={!lookupComplete || checking}
                />
              </div>
            </div>

            {/* TELUGU NAME */}
            <div className="svs-field">
              <label htmlFor="telugu_name">
                <FiType />
                Telugu Name
                <span className="svs-optional">OPTIONAL</span>
              </label>

              <div className="svs-input-wrap">
                <FiType className="svs-field-icon" />
                <input
                  id="telugu_name"
                  type="text"
                  name="telugu_name"
                  value={form.telugu_name}
                  onChange={this.handleChange}
                  placeholder="తెలుగు పేరు"
                  disabled={!lookupComplete || checking}
                />
              </div>
            </div>

            {/* ADDRESS */}
            <div className="svs-field">
              <label htmlFor="address">
                <FiMapPin />
                Address
                <span className="svs-optional">OPTIONAL</span>
              </label>

              <div className="svs-input-wrap svs-textarea-wrap">
                <FiMapPin className="svs-field-icon" />
                <textarea
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={this.handleChange}
                  placeholder="Enter complete address"
                  rows={3}
                  disabled={!lookupComplete || checking}
                />
              </div>
            </div>

            {/* MESSAGES */}
            {error && (
              <div className="svs-form-message svs-error-message">
                <FiAlertCircle />
                {error}
              </div>
            )}

            {success && (
              <div className="svs-form-message svs-success-message">
                <FiCheckCircle />
                {success}
              </div>
            )}

            {/* BUTTONS */}
            <div className="svs-form-actions">
              <button
                type="button"
                className="svs-reset-button"
                onClick={this.resetForm}
                disabled={saving}
              >
                Reset
              </button>

              <button
                type="submit"
                className="svs-submit-button"
                disabled={
                  saving ||
                  checking ||
                  !lookupComplete ||
                  !form.customer_name.trim() ||
                  form.mobile_number.length !== 10
                }
              >
                {saving ? (
                  <>
                    <FiRefreshCw className="svs-button-spinner" />
                    Saving...
                  </>
                ) : customerFound ? (
                  <>
                    <FiSave />
                    Update Customer
                  </>
                ) : (
                  <>
                    <FiSave />
                    Save Customer
                  </>
                )}
              </button>
            </div>
          </form>

          <footer className="svs-form-footer">
            <span>SVS JEWELLERY</span>
            <i />
            <span>Thank you for visiting us</span>
          </footer>
        </section>
      </main>
    );
  }
}

export default Customers;