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
  FiWifi,
  FiArrowRight,
} from "react-icons/fi";

import "./Customers.css";

const API_URL =
  "https://svs-jewellery-backend.onrender.com/api/customers";

class Customers extends Component {
  state = {
    connecting: true,
    connectionProgress: 0,
    connectionError: "",

    form: {
      customer_name: "",
      mobile_number: "",
      telugu_name: "",
      address: "",
    },

    editingCustomer: null,
    lookupComplete: false,
    checkingMobile: false,

    saving: false,
    error: "",
    success: "",
  };

  connectionTimer = null;
  lookupTimer = null;
  connectionRequest = false;
  requestId = 0;
  mounted = false;

  componentDidMount() {
    this.mounted = true;
    this.connectToApi();
  }

  componentWillUnmount() {
    this.mounted = false;
    clearInterval(this.connectionTimer);
    clearTimeout(this.lookupTimer);
    this.requestId += 1;
  }

  // --------------------------------------------------
  // INITIAL BACKEND CONNECTION
  // --------------------------------------------------

  connectToApi = async () => {
    if (this.connectionRequest) return;

    this.connectionRequest = true;
    clearInterval(this.connectionTimer);

    this.setState({
      connecting: true,
      connectionProgress: 0,
      connectionError: "",
    });

    let progress = 0;

    this.connectionTimer = setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 8) + 3, 90);

      if (this.mounted) {
        this.setState({ connectionProgress: progress });
      }
    }, 180);

    try {
      await axios.get(API_URL, { timeout: 30000 });

      clearInterval(this.connectionTimer);

      this.setState({ connectionProgress: 100 });

      setTimeout(() => {
        if (!this.mounted) return;

        this.setState({
          connecting: false,
          connectionError: "",
        });

        this.connectionRequest = false;
      }, 650);
    } catch (error) {
      clearInterval(this.connectionTimer);

      if (!this.mounted) return;

      this.connectionRequest = false;

      this.setState({
        connecting: false,
        connectionProgress: 0,
        connectionError:
          "Unable to connect. Please check your internet connection.",
      });
    }
  };

  // --------------------------------------------------
  // MOBILE NUMBER CHANGE
  // --------------------------------------------------

  handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "mobile_number") {
      const mobile = value.replace(/\D/g, "").slice(0, 10);

      clearTimeout(this.lookupTimer);

      // Invalidate previous lookup requests
      this.requestId += 1;

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
          editingCustomer: null,
          lookupComplete: false,
          checkingMobile: mobile.length === 10,
          error: "",
          success: "",
        }),
        () => {
          if (mobile.length === 10) {
            this.lookupTimer = setTimeout(() => {
              this.fetchCustomer(mobile);
            }, 350);
          } else {
            this.setState({ checkingMobile: false });
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

  // --------------------------------------------------
  // LOOKUP CUSTOMER BY MOBILE
  // No full-screen animation here
  // --------------------------------------------------

  fetchCustomer = async (mobile) => {
    const currentRequest = ++this.requestId;

    this.setState({
      checkingMobile: true,
      lookupComplete: false,
      error: "",
    });

    try {
      const response = await axios.get(
        `${API_URL}/mobile/${mobile}`,
        { timeout: 15000 }
      );

      if (!this.mounted || currentRequest !== this.requestId) return;

      const customer =
        response.data?.customer ||
        response.data?.data?.customer ||
        response.data?.data ||
        response.data;

      if (!customer || !customer.id) {
        this.setState({
          checkingMobile: false,
          lookupComplete: true,
          editingCustomer: null,
        });
        return;
      }

      this.setState({
        checkingMobile: false,
        lookupComplete: true,
        editingCustomer: customer,
        form: {
          customer_name: customer.customer_name || "",
          mobile_number: mobile,
          telugu_name: customer.telugu_name || "",
          address: customer.address || "",
        },
        success: "Existing customer found.",
      });
    } catch (error) {
      if (!this.mounted || currentRequest !== this.requestId) return;

      if (error.response?.status === 404) {
        this.setState({
          checkingMobile: false,
          lookupComplete: true,
          editingCustomer: null,
          success: "New customer. Please enter the details.",
        });
      } else {
        this.setState({
          checkingMobile: false,
          lookupComplete: true,
          error:
            error.response?.data?.message ||
            "Unable to check this mobile number.",
        });
      }
    }
  };

  // --------------------------------------------------
  // SUBMIT CUSTOMER
  // --------------------------------------------------

  handleSubmit = async (event) => {
    event.preventDefault();

    if (this.state.saving) return;

    const {
      customer_name,
      mobile_number,
      telugu_name,
      address,
    } = this.state.form;

    const { editingCustomer } = this.state;

    if (!customer_name.trim()) {
      this.setState({ error: "Please enter customer name." });
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile_number)) {
      this.setState({
        error: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    const payload = {
      customer_name: customer_name.trim(),
      mobile_number: mobile_number.trim(),
      telugu_name: telugu_name.trim() || null,
      address: address.trim() || null,
    };

    this.setState({
      saving: true,
      error: "",
      success: "",
    });

    try {
      if (editingCustomer?.id) {
        await axios.put(
          `${API_URL}/${editingCustomer.id}`,
          payload
        );
      } else {
        await axios.post(API_URL, payload);
      }

      if (!this.mounted) return;

      this.setState({
        saving: false,
        success: editingCustomer
          ? "Customer updated successfully!"
          : "Customer registered successfully!",
        error: "",
      });

      setTimeout(() => {
        if (!this.mounted) return;

        this.setState({
          form: {
            customer_name: "",
            mobile_number: "",
            telugu_name: "",
            address: "",
          },
          editingCustomer: null,
          lookupComplete: false,
          checkingMobile: false,
          success: "",
          error: "",
        });
      }, 1400);
    } catch (error) {
      if (!this.mounted) return;

      this.setState({
        saving: false,
        error:
          error.response?.data?.message ||
          "Unable to save customer. Please try again.",
      });
    }
  };

  // --------------------------------------------------
  // RESET FORM
  // --------------------------------------------------

  resetForm = () => {
    clearTimeout(this.lookupTimer);
    this.requestId += 1;

    this.setState({
      form: {
        customer_name: "",
        mobile_number: "",
        telugu_name: "",
        address: "",
      },
      editingCustomer: null,
      lookupComplete: false,
      checkingMobile: false,
      error: "",
      success: "",
    });
  };

  // --------------------------------------------------
  // CONNECTION SCREEN
  // --------------------------------------------------

  renderConnectionScreen = () => {
    const { connectionProgress, connectionError } = this.state;

    return (
      <div className="svs-connection-screen">
        <div className="connection-glow connection-glow-one" />
        <div className="connection-glow connection-glow-two" />

        <div className="connection-content">
          <div className="svs-logo">
            <div className="svs-logo-inner">
              <span>SVS</span>
            </div>
          </div>

          <div className="connection-brand">SVS JEWELLERY</div>
          <div className="connection-subtitle">
            A tradition of trust & elegance
          </div>

          <div className="connection-progress-track">
            <div
              className="connection-progress-fill"
              style={{ width: `${connectionProgress}%` }}
            />
          </div>

          <div className="connection-percentage">
            {connectionProgress}%
          </div>

          <div className="connection-status">
            <FiWifi />
            Connecting securely to SVS server
          </div>

          {connectionError && (
            <div className="connection-error">
              <p>{connectionError}</p>
              <button onClick={this.connectToApi}>
                <FiRefreshCw /> Retry connection
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --------------------------------------------------
  // MAIN FORM
  // --------------------------------------------------

  render() {
    const {
      connecting,
      form,
      editingCustomer,
      checkingMobile,
      saving,
      error,
      success,
    } = this.state;

    if (connecting) {
      return this.renderConnectionScreen();
    }

    return (
      <main className="customers-page">
        <div className="customer-bg-orb orb-one" />
        <div className="customer-bg-orb orb-two" />
        <div className="customer-bg-grid" />

        <section className="registration-card">
          <header className="registration-header">
            <div className="registration-logo">
              <span>SVS</span>
            </div>

            <div className="registration-brand">
              <span>WELCOME TO</span>
              <h1>SVS JEWELLERY</h1>
              <p>Customer Registration</p>
            </div>

            <div className="secure-indicator">
              <span className="secure-dot" />
              Connected
            </div>
          </header>

          <div className="registration-divider" />

          <div className="registration-heading">
            <div>
              <h2>
                {editingCustomer
                  ? "Welcome Back!"
                  : "Your Details"}
              </h2>
              <p>
                {editingCustomer
                  ? "We found your existing customer profile."
                  : "Please enter your details to continue."}
              </p>
            </div>

            {editingCustomer && (
              <span className="existing-tag">
                <FiCheckCircle /> Existing
              </span>
            )}
          </div>

          <form
            className="customer-registration-form"
            onSubmit={this.handleSubmit}
          >
            <div className="registration-field">
              <label htmlFor="mobile_number">
                <FiPhone />
                Mobile Number <span className="required">*</span>
              </label>

              <div className="registration-input mobile-input">
                <span className="country-code">+91</span>

                <input
                  id="mobile_number"
                  type="tel"
                  name="mobile_number"
                  value={form.mobile_number}
                  onChange={this.handleChange}
                  placeholder="Enter 10 digit mobile number"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />

                <span className="mobile-count">
                  {checkingMobile ? (
                    <FiRefreshCw className="spin" />
                  ) : (
                    `${form.mobile_number.length}/10`
                  )}
                </span>
              </div>

              <small className="field-hint">
                {checkingMobile
                  ? "Checking customer details..."
                  : "Enter your mobile number to check your profile."}
              </small>
            </div>

            <div className="registration-field">
              <label htmlFor="customer_name">
                <FiUser />
                Customer Name <span className="required">*</span>
              </label>

              <div className="registration-input">
                <FiUser />

                <input
                  id="customer_name"
                  type="text"
                  name="customer_name"
                  value={form.customer_name}
                  onChange={this.handleChange}
                  placeholder="Enter customer full name"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="registration-field">
              <label htmlFor="telugu_name">
                <FiType />
                Telugu Name
                <span className="optional">Optional</span>
              </label>

              <div className="registration-input">
                <FiType />

                <input
                  id="telugu_name"
                  type="text"
                  name="telugu_name"
                  value={form.telugu_name}
                  onChange={this.handleChange}
                  placeholder="తెలుగు పేరు"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="registration-field">
              <label htmlFor="address">
                <FiMapPin />
                Address
                <span className="optional">Optional</span>
              </label>

              <div className="registration-input">
                <FiMapPin />

                <input
                  id="address"
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={this.handleChange}
                  placeholder="Enter your address"
                  autoComplete="street-address"
                />
              </div>
            </div>

            {error && (
              <div className="registration-message message-error">
                <FiAlertCircle />
                {error}
              </div>
            )}

            {success && (
              <div className="registration-message message-success">
                <FiCheckCircle />
                {success}
              </div>
            )}

            <div className="registration-actions">
              <button
                type="button"
                className="registration-reset"
                onClick={this.resetForm}
                disabled={saving}
              >
                Reset
              </button>

              <button
                type="submit"
                className="registration-submit"
                disabled={saving || checkingMobile}
              >
                {saving ? (
                  <>
                    <FiRefreshCw className="spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    {editingCustomer
                      ? "Update Details"
                      : "Register"}
                    <FiArrowRight />
                  </>
                )}
              </button>
            </div>
          </form>

          <footer className="registration-footer">
            <span>SVS JEWELLERY</span>
            <span>Thank you for choosing us</span>
          </footer>
        </section>
      </main>
    );
  }
}

export default Customers;