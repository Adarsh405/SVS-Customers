
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

    connecting: true,
    connectionProgress: 0,
    connectionReady: false,

    saving: false,
    customerFound: false,
    lookupComplete: false,
    editingCustomer: null,

    error: "",
    success: "",
  };

  lookupTimer = null;
  progressTimer = null;
  finishTimer = null;
  requestId = 0;
  connectionRequestId = 0;

  componentDidMount() {
    this.connectToApi();
  }

  componentWillUnmount() {
    clearTimeout(this.lookupTimer);
    clearInterval(this.progressTimer);
    clearTimeout(this.finishTimer);

    this.requestId += 1;
    this.connectionRequestId += 1;
  }

  startConnectionAnimation = () => {
    clearInterval(this.progressTimer);
    clearTimeout(this.finishTimer);

    this.setState({
      connecting: true,
      connectionProgress: 0,
    });

    this.progressTimer = setInterval(() => {
      this.setState((prev) => ({
        connectionProgress: Math.min(
          prev.connectionProgress + Math.ceil(Math.random() * 5),
          92
        ),
      }));
    }, 120);
  };

  finishConnectionAnimation = (callback) => {
    clearInterval(this.progressTimer);

    this.setState({
      connectionProgress: 100,
    });

    this.finishTimer = setTimeout(() => {
      this.setState(
        {
          connecting: false,
        },
        callback
      );
    }, 450);
  };

  stopConnectionAnimation = () => {
    clearInterval(this.progressTimer);
    clearTimeout(this.finishTimer);

    this.setState({
      connecting: false,
      connectionProgress: 0,
    });
  };

  // INITIAL BACKEND CONNECTION
  // Called once when the page mounts.
  connectToApi = async () => {
    const currentRequest = ++this.connectionRequestId;

    this.startConnectionAnimation();

    this.setState({
      error: "",
      connectionReady: false,
    });

    try {
      await axios.get(API_URL, {
        timeout: 30000,
      });

      if (currentRequest !== this.connectionRequestId) return;

      this.finishConnectionAnimation(() => {
        if (currentRequest !== this.connectionRequestId) return;

        this.setState({
          connectionReady: true,
          error: "",
        });
      });
    } catch (error) {
      if (currentRequest !== this.connectionRequestId) return;

      console.error("SVS API connection error:", error);

      this.stopConnectionAnimation();

      this.setState({
        connectionReady: false,
        error:
          "Unable to connect to SVS server. Please check your internet connection.",
      });
    }
  };

  // MOBILE NUMBER INPUT
  handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "mobile_number") {
      const mobile = value.replace(/\D/g, "").slice(0, 10);

      clearTimeout(this.lookupTimer);

      this.requestId += 1;

      this.setState(
        {
          form: {
            ...EMPTY_FORM,
            mobile_number: mobile,
          },
          customerFound: false,
          lookupComplete: false,
          editingCustomer: null,
          connecting: false,
          connectionProgress: 0,
          error: "",
          success: "",
        },
        () => {
          if (mobile.length === 10 && this.state.connectionReady) {
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

  // CUSTOMER LOOKUP
  fetchCustomer = async (mobile) => {
    if (!/^[0-9]{10}$/.test(mobile)) return;

    const currentRequest = ++this.requestId;

    this.startConnectionAnimation();

    try {
      const response = await axios.get(
        `${API_URL}/mobile/${mobile}`,
        {
          timeout: 30000,
        }
      );

      if (currentRequest !== this.requestId) return;

      const data = response.data;

      const customer =
        data?.customer ||
        data?.data?.customer ||
        data?.data ||
        data;

      if (
        !customer ||
        customer.success === false ||
        customer.id == null
      ) {
        this.finishConnectionAnimation(() => {
          if (currentRequest !== this.requestId) return;

          this.setState({
            lookupComplete: true,
            customerFound: false,
            editingCustomer: null,
            form: {
              ...EMPTY_FORM,
              mobile_number: mobile,
            },
            error: "",
          });
        });

        return;
      }

      this.finishConnectionAnimation(() => {
        if (currentRequest !== this.requestId) return;

        this.setState({
          lookupComplete: true,
          customerFound: true,
          editingCustomer: customer,

          form: {
            customer_name: customer.customer_name || "",
            mobile_number: mobile,
            telugu_name: customer.telugu_name || "",
            address: customer.address || "",
          },

          error: "",
        });
      });
    } catch (error) {
      if (currentRequest !== this.requestId) return;

      console.error("Customer lookup error:", error);

      this.stopConnectionAnimation();

      if (error.response?.status === 404) {
        this.setState({
          lookupComplete: true,
          customerFound: false,
          editingCustomer: null,
          form: {
            ...EMPTY_FORM,
            mobile_number: mobile,
          },
          error: "",
        });
      } else {
        this.setState({
          lookupComplete: false,
          customerFound: false,
          editingCustomer: null,
          error:
            error.response?.data?.message ||
            "Unable to find customer details. Please retry.",
        });
      }
    }
  };

  retryLookup = () => {
    const mobile = this.state.form.mobile_number;

    if (mobile.length === 10) {
      this.fetchCustomer(mobile);
    }
  };

  // SAVE CUSTOMER
  handleSubmit = async (event) => {
    event.preventDefault();

    const {
      form,
      customerFound,
      editingCustomer,
      saving,
      lookupComplete,
      connectionReady,
    } = this.state;

    if (saving) return;

    if (!connectionReady) {
      this.setState({
        error: "Please connect to the SVS server first.",
      });
      return;
    }

    if (!lookupComplete) {
      this.setState({
        error: "Please wait until mobile number verification is complete.",
      });
      return;
    }

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
        customerFound && editingCustomer?.id != null
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
          : "New customer registered successfully!",
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

  // RESET FORM
  resetForm = () => {
    clearTimeout(this.lookupTimer);
    clearInterval(this.progressTimer);
    clearTimeout(this.finishTimer);

    this.requestId += 1;

    this.setState({
      form: { ...EMPTY_FORM },
      connecting: false,
      connectionProgress: 0,
      saving: false,
      customerFound: false,
      lookupComplete: false,
      editingCustomer: null,
      error: "",
      success: "",
    });
  };

  // FULL SCREEN CONNECTION ANIMATION
  renderConnectionScreen() {
    const { connectionProgress } = this.state;

    return (
      <div className="svs-connection-screen">
        <div className="svs-connect-orb svs-connect-orb-one" />
        <div className="svs-connect-orb svs-connect-orb-two" />

        <div className="svs-connection-content">
          <div className="svs-loading-logo">
            <div className="svs-logo-ring svs-ring-one" />
            <div className="svs-logo-ring svs-ring-two" />

            <div className="svs-logo-center">
              <span>SVS</span>
            </div>
          </div>

          <div className="svs-loading-brand">
            <h1>SVS JEWELLERY</h1>
            <span>EXCELLENCE IN EVERY DETAIL</span>
          </div>

          <div className="svs-loading-message">
            <h2>
              {connectionProgress >= 100
                ? "Connected Successfully"
                : "Connecting Securely"}
            </h2>

            <p>
              {connectionProgress >= 100
                ? "Customer information is ready"
                : "Retrieving customer information"}
            </p>
          </div>

          <div className="svs-loading-progress">
            <div className="svs-progress-heading">
              <span>
                <i className="svs-connection-dot" />

                {connectionProgress >= 100
                  ? "Connection complete"
                  : "Establishing connection"}
              </span>

              <strong>{connectionProgress}%</strong>
            </div>

            <div className="svs-progress-bar">
              <div
                className="svs-progress-bar-fill"
                style={{
                  width: `${connectionProgress}%`,
                }}
              />

              <div
                className="svs-progress-shimmer"
                style={{
                  left: `${Math.max(
                    connectionProgress - 10,
                    0
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="svs-loading-dots">
            <span />
            <span />
            <span />
          </div>

          <div className="svs-loading-footer">
            A PREMIUM CUSTOMER EXPERIENCE
          </div>
        </div>
      </div>
    );
  }

  render() {
    const {
      form,
      connecting,
      connectionReady,
      saving,
      customerFound,
      lookupComplete,
      error,
      success,
    } = this.state;

    if (connecting) {
      return this.renderConnectionScreen();
    }

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

          {/* HEADING */}

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
                  disabled={!connectionReady}
                />

                {lookupComplete && customerFound && (
                  <FiCheckCircle className="svs-input-success" />
                )}

                {lookupComplete && !customerFound && (
                  <FiSearch className="svs-input-search" />
                )}
              </div>

              <div className="svs-mobile-meta">
                <span>
                  {!connectionReady
                    ? "Connect to SVS server to continue"
                    : customerFound
                    ? "Existing customer found"
                    : lookupComplete
                    ? "New customer — enter details"
                    : "Enter all 10 digits to search automatically"}
                </span>

                <strong>
                  {form.mobile_number.length}/10
                </strong>
              </div>
            </div>

            {/* CUSTOMER STATUS */}

            {customerFound && lookupComplete && (
              <div className="svs-result-banner svs-found-banner">
                <FiCheckCircle />
                <span>
                  Customer found! You can modify the details below.
                </span>
              </div>
            )}

            {!customerFound && lookupComplete && (
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
                  disabled={!lookupComplete}
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
                  disabled={!lookupComplete}
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
                  disabled={!lookupComplete}
                />
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div className="svs-form-message svs-error-message">
                <FiAlertCircle />
                <span>{error}</span>

                <button
                  type="button"
                  className="svs-retry-button"
                  onClick={
                    connectionReady
                      ? this.retryLookup
                      : this.connectToApi
                  }
                >
                  Retry
                </button>
              </div>
            )}

            {/* SUCCESS */}

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
                  !connectionReady ||
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

          {/* FOOTER */}

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
